
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBlumeSwapFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IBlumeSwapPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint32 blockTimestampLast);
    function mint(address to) external returns (uint256 liquidity);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
}

interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint value) external returns (bool);
    function withdraw(uint) external;
}

/**
 * @title FixedBlumeSwapRouter
 * @dev Modified router for interacting with BlumeSwap liquidity pools
 * with improved error handling and more robust implementation
 */
contract FixedBlumeSwapRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public immutable factory;
    address public immutable WETH;
    
    uint256 private constant DEADLINE_DURATION = 20 minutes;
    
    event LiquidityAdded(address indexed tokenA, address indexed tokenB, uint amountA, uint amountB, uint liquidity);
    event LiquidityRemoved(address indexed tokenA, address indexed tokenB, uint amountA, uint amountB, uint liquidity);
    event Swap(address[] path, uint[] amounts, address indexed to);
    
    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "FixedBlumeSwapRouter: EXPIRED");
        _;
    }
    
    constructor(address _factory, address _WETH) {
        require(_factory != address(0), "FixedBlumeSwapRouter: ZERO_FACTORY");
        require(_WETH != address(0), "FixedBlumeSwapRouter: ZERO_WETH");
        factory = _factory;
        WETH = _WETH;
    }
    
    receive() external payable {
        assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
    }
    
    // **** ADD LIQUIDITY ****
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal virtual returns (uint256 amountA, uint256 amountB) {
        // Create pair if it doesn't exist
        address pair = IBlumeSwapFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IBlumeSwapFactory(factory).createPair(tokenA, tokenB);
        }
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_CREATION_FAILED");
        
        (uint256 reserveA, uint256 reserveB) = _getReserves(tokenA, tokenB, pair);
        
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = _quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "FixedBlumeSwapRouter: INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = _quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, "FixedBlumeSwapRouter: INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external virtual ensure(deadline) nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(tokenA != tokenB, "FixedBlumeSwapRouter: IDENTICAL_ADDRESSES");
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = IBlumeSwapFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
        
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        
        // Mint LP tokens to recipient
        liquidity = IBlumeSwapPair(pair).mint(to);
        
        emit LiquidityAdded(tokenA, tokenB, amountA, amountB, liquidity);
    }
    
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external virtual payable ensure(deadline) nonReentrant returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        (amountToken, amountETH) = _addLiquidity(
            token,
            WETH,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );
        address pair = IBlumeSwapFactory(factory).getPair(token, WETH);
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
        
        _safeTransferFrom(token, msg.sender, pair, amountToken);
        IWETH(WETH).deposit{value: amountETH}();
        assert(IWETH(WETH).transfer(pair, amountETH));
        
        liquidity = IBlumeSwapPair(pair).mint(to);
        
        // Refund any unused ETH
        if (msg.value > amountETH) {
            _safeTransferETH(msg.sender, msg.value - amountETH);
        }
        
        emit LiquidityAdded(token, WETH, amountToken, amountETH, liquidity);
    }
    
    // **** REMOVE LIQUIDITY ****
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public virtual ensure(deadline) nonReentrant returns (uint256 amountA, uint256 amountB) {
        address pair = IBlumeSwapFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
        
        IERC20(pair).safeTransferFrom(msg.sender, pair, liquidity);
        (amountA, amountB) = IBlumeSwapPair(pair).burn(to);
        
        (address token0,) = _sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amountA, amountB) : (amountB, amountA);
        
        require(amountA >= amountAMin, "FixedBlumeSwapRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "FixedBlumeSwapRouter: INSUFFICIENT_B_AMOUNT");
        
        emit LiquidityRemoved(tokenA, tokenB, amountA, amountB, liquidity);
    }
    
    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) public virtual ensure(deadline) nonReentrant returns (uint256 amountToken, uint256 amountETH) {
        (amountToken, amountETH) = removeLiquidity(
            token,
            WETH,
            liquidity,
            amountTokenMin,
            amountETHMin,
            address(this),
            deadline
        );
        _safeTransfer(token, to, amountToken);
        IWETH(WETH).withdraw(amountETH);
        _safeTransferETH(to, amountETH);
    }
    
    // **** SWAP ****
    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? IBlumeSwapFactory(factory).getPair(output, path[i + 2]) : _to;
            
            // Debugging events for monitoring swap parameters
            // emit Debug(amount0Out, amount1Out, input, output, to);
            
            IBlumeSwapPair(IBlumeSwapFactory(factory).getPair(input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }
    
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual ensure(deadline) nonReentrant returns (uint[] memory amounts) {
        require(path.length >= 2, "FixedBlumeSwapRouter: INVALID_PATH");
        require(amountIn > 0, "FixedBlumeSwapRouter: INSUFFICIENT_INPUT_AMOUNT");
        
        amounts = _getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "FixedBlumeSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Transfer exact tokens from sender to first pair
        address pair = IBlumeSwapFactory(factory).getPair(path[0], path[1]);
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
        
        _safeTransferFrom(path[0], msg.sender, pair, amountIn);
        _swap(amounts, path, to);
        
        emit Swap(path, amounts, to);
    }
    
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual ensure(deadline) nonReentrant returns (uint[] memory amounts) {
        require(path.length >= 2, "FixedBlumeSwapRouter: INVALID_PATH");
        require(amountOut > 0, "FixedBlumeSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        amounts = _getAmountsIn(amountOut, path);
        require(amounts[0] <= amountInMax, "FixedBlumeSwapRouter: EXCESSIVE_INPUT_AMOUNT");
        
        // Transfer exact tokens from sender to first pair
        address pair = IBlumeSwapFactory(factory).getPair(path[0], path[1]);
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
        
        _safeTransferFrom(path[0], msg.sender, pair, amounts[0]);
        _swap(amounts, path, to);
        
        emit Swap(path, amounts, to);
    }
    
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual payable ensure(deadline) nonReentrant returns (uint[] memory amounts) {
        require(path.length >= 2, "FixedBlumeSwapRouter: INVALID_PATH");
        require(path[0] == WETH, "FixedBlumeSwapRouter: INVALID_PATH");
        require(msg.value > 0, "FixedBlumeSwapRouter: INSUFFICIENT_INPUT_AMOUNT");
        
        amounts = _getAmountsOut(msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "FixedBlumeSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        IWETH(WETH).deposit{value: msg.value}();
        address pair = IBlumeSwapFactory(factory).getPair(path[0], path[1]);
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
        
        assert(IWETH(WETH).transfer(pair, amounts[0]));
        _swap(amounts, path, to);
        
        emit Swap(path, amounts, to);
    }
    
    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual ensure(deadline) nonReentrant returns (uint[] memory amounts) {
        require(path.length >= 2, "FixedBlumeSwapRouter: INVALID_PATH");
        require(path[path.length - 1] == WETH, "FixedBlumeSwapRouter: INVALID_PATH");
        require(amountOut > 0, "FixedBlumeSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        amounts = _getAmountsIn(amountOut, path);
        require(amounts[0] <= amountInMax, "FixedBlumeSwapRouter: EXCESSIVE_INPUT_AMOUNT");
        
        // Transfer exact tokens from sender to first pair
        address pair = IBlumeSwapFactory(factory).getPair(path[0], path[1]);
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
        
        _safeTransferFrom(path[0], msg.sender, pair, amounts[0]);
        _swap(amounts, path, address(this));
        
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        _safeTransferETH(to, amounts[amounts.length - 1]);
        
        emit Swap(path, amounts, to);
    }
    
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual ensure(deadline) nonReentrant returns (uint[] memory amounts) {
        require(path.length >= 2, "FixedBlumeSwapRouter: INVALID_PATH");
        require(path[path.length - 1] == WETH, "FixedBlumeSwapRouter: INVALID_PATH");
        require(amountIn > 0, "FixedBlumeSwapRouter: INSUFFICIENT_INPUT_AMOUNT");
        
        amounts = _getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "FixedBlumeSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Transfer exact tokens from sender to first pair
        address pair = IBlumeSwapFactory(factory).getPair(path[0], path[1]);
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
        
        _safeTransferFrom(path[0], msg.sender, pair, amountIn);
        _swap(amounts, path, address(this));
        
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        _safeTransferETH(to, amounts[amounts.length - 1]);
        
        emit Swap(path, amounts, to);
    }
    
    function swapETHForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual payable ensure(deadline) nonReentrant returns (uint[] memory amounts) {
        require(path.length >= 2, "FixedBlumeSwapRouter: INVALID_PATH");
        require(path[0] == WETH, "FixedBlumeSwapRouter: INVALID_PATH");
        require(amountOut > 0, "FixedBlumeSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        amounts = _getAmountsIn(amountOut, path);
        require(amounts[0] <= msg.value, "FixedBlumeSwapRouter: EXCESSIVE_INPUT_AMOUNT");
        
        IWETH(WETH).deposit{value: amounts[0]}();
        address pair = IBlumeSwapFactory(factory).getPair(path[0], path[1]);
        require(pair != address(0), "FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
        
        assert(IWETH(WETH).transfer(pair, amounts[0]));
        _swap(amounts, path, to);
        
        // Refund any unused ETH
        if (msg.value > amounts[0]) {
            _safeTransferETH(msg.sender, msg.value - amounts[0]);
        }
        
        emit Swap(path, amounts, to);
    }
    
    // **** LIBRARY FUNCTIONS ****
    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "FixedBlumeSwapRouter: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "FixedBlumeSwapRouter: ZERO_ADDRESS");
    }
    
    function _getReserves(address tokenA, address tokenB, address pair) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = _sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IBlumeSwapPair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }
    
    function _quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {
        require(amountA > 0, "FixedBlumeSwapRouter: INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "FixedBlumeSwapRouter: INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / reserveA;
    }
    
    function _getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
        require(amountIn > 0, "FixedBlumeSwapRouter: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "FixedBlumeSwapRouter: INSUFFICIENT_LIQUIDITY");
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    function _getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) internal pure returns (uint amountIn) {
        require(amountOut > 0, "FixedBlumeSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "FixedBlumeSwapRouter: INSUFFICIENT_LIQUIDITY");
        uint numerator = reserveIn * amountOut * 1000;
        uint denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }
    
    function _getAmountsOut(uint amountIn, address[] memory path) internal view returns (uint[] memory amounts) {
        require(path.length >= 2, "FixedBlumeSwapRouter: INVALID_PATH");
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            address pair = IBlumeSwapFactory(factory).getPair(path[i], path[i + 1]);
            if (pair == address(0)) {
                revert("FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
            }
            (uint reserveIn, uint reserveOut) = _getReserves(path[i], path[i + 1], pair);
            amounts[i + 1] = _getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }
    
    function _getAmountsIn(uint amountOut, address[] memory path) internal view returns (uint[] memory amounts) {
        require(path.length >= 2, "FixedBlumeSwapRouter: INVALID_PATH");
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            address pair = IBlumeSwapFactory(factory).getPair(path[i - 1], path[i]);
            if (pair == address(0)) {
                revert("FixedBlumeSwapRouter: PAIR_DOES_NOT_EXIST");
            }
            (uint reserveIn, uint reserveOut) = _getReserves(path[i - 1], path[i], pair);
            amounts[i - 1] = _getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
    
    // Helper functions for safe token transfers
    function _safeTransfer(address token, address to, uint value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "FixedBlumeSwapRouter: TRANSFER_FAILED");
    }
    
    function _safeTransferFrom(address token, address from, address to, uint value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "FixedBlumeSwapRouter: TRANSFER_FROM_FAILED");
    }
    
    function _safeTransferETH(address to, uint value) internal {
        (bool success,) = to.call{value: value}("");
        require(success, "FixedBlumeSwapRouter: ETH_TRANSFER_FAILED");
    }
}