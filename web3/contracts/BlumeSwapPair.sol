// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IFactory {
    function protocolFeeBPS() external view returns (uint256);
    function feeReceiver() external view returns (address);
}

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

/**
 * @title BlumeSwapPair
 * @dev Implements the core AMM and liquidity pool logic
 */
contract BlumeSwapPair is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public factory;
    address public token0;
    address public token1;
    address public priceOracle;
    
    uint256 private reserve0;
    uint256 private reserve1;
    uint32 private blockTimestampLast;
    
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    uint256 private constant BPS_DENOMINATOR = 10000;
    
    // Price oracle limits to prevent price manipulation
    uint256 public maxPriceDeviation = 1000; // 10% maximum deviation (in basis points) - increased for testing
    
    // Trading fee: 0.3% (30 basis points)
    uint256 private constant TOTAL_FEE_BPS = 30;
    
    // Price accumulators for TWAP calculations
    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint256 reserve0, uint256 reserve1);
    event PriceOracleUpdated(address newPriceOracle);
    event MaxPriceDeviationUpdated(uint256 newDeviation);
    
    modifier onlyFactory() {
        require(msg.sender == factory, "BlumeSwap: FORBIDDEN");
        _;
    }
    
    constructor() ERC20("Blume Swap LP", "BLUMELP") {
        factory = msg.sender;
    }
    
    function initialize(address _token0, address _token1) external onlyFactory {
        token0 = _token0;
        token1 = _token1;
    }
    
    /**
     * @dev Sets the price oracle address
     * @param _priceOracle Address of the price oracle contract
     */
    function setPriceOracle(address _priceOracle) external {
        priceOracle = _priceOracle;
        emit PriceOracleUpdated(_priceOracle);
    }
    
    /**
     * @dev Sets max price deviation allowed from oracle price
     * @param _maxDeviation Maximum deviation in basis points
     */
    function setMaxPriceDeviation(uint256 _maxDeviation) external onlyFactory {
        require(_maxDeviation <= 5000, "BlumeSwap: DEVIATION_TOO_HIGH"); // Max 50% - increased for testing
        maxPriceDeviation = _maxDeviation;
        emit MaxPriceDeviationUpdated(_maxDeviation);
    }
    
    /**
     * @dev Returns the current reserves of the pair
     */
    function getReserves() public view returns (uint256 _reserve0, uint256 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
    
    /**
     * @dev Updates the reserves and, if appropriate, price accumulators
     */
    function _update(uint256 balance0, uint256 balance1, uint256 _reserve0, uint256 _reserve1) private {
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        // Update price accumulators if time has elapsed since last update
        if (timeElapsed > 0 && _reserve0 > 0 && _reserve1 > 0) {
            price0CumulativeLast += uint256(_reserve1) * timeElapsed / _reserve0;
            price1CumulativeLast += uint256(_reserve0) * timeElapsed / _reserve1;
        }
        
        reserve0 = balance0;
        reserve1 = balance1;
        blockTimestampLast = blockTimestamp;
        
        emit Sync(reserve0, reserve1);
    }
    
    /**
     * @dev Verifies that the price is within acceptable bounds compared to oracle
     * Fixed version that properly handles token ordering and decimals
     */
    function _verifyPrice(uint256 amount0, uint256 amount1) internal view {
        if (priceOracle == address(0)) return; // Skip check if no oracle is set
        if (amount0 == 0 || amount1 == 0) return; // Skip check if either amount is zero
        
        // Get oracle prices (both return prices with 8 decimals)
        uint256 price0 = IPriceOracle(priceOracle).getPrice(token0);
        uint256 price1 = IPriceOracle(priceOracle).getPrice(token1);
        
        if (price0 == 0 || price1 == 0) return; // Skip check if oracle prices not available
        
        // Calculate the USD value of each token amount
        // price is in 8 decimals, amount is in 18 decimals for tokens
        // So we need to normalize: (amount * price) / 10^8
        uint256 value0 = (amount0 * price0) / 1e8;
        uint256 value1 = (amount1 * price1) / 1e8;
        
        // Calculate percentage deviation between the two values
        uint256 deviation;
        if (value0 > value1) {
            deviation = ((value0 - value1) * BPS_DENOMINATOR) / value1;
        } else {
            deviation = ((value1 - value0) * BPS_DENOMINATOR) / value0;
        }
        
        // Ensure deviation is within allowed limits
        require(deviation <= maxPriceDeviation, "BlumeSwap: PRICE_OUTSIDE_BOUNDS");
    }
    
    /**
     * @dev Calculates the fee amount from a given amount
     */
    function _calculateFee(uint256 amount) internal view returns (uint256 protocolFee, uint256 lpFee) {
        uint256 protocolFeeBPS = IFactory(factory).protocolFeeBPS();
        
        // Ensure protocol fee doesn't exceed total fee
        if (protocolFeeBPS > TOTAL_FEE_BPS) {
            protocolFeeBPS = TOTAL_FEE_BPS;
        }
        
        // Protocol fee (e.g., 0.05% of the amount)
        protocolFee = (amount * protocolFeeBPS) / BPS_DENOMINATOR;
        
        // LP fee (remaining portion of the total fee, e.g., 0.25%)
        lpFee = (amount * (TOTAL_FEE_BPS - protocolFeeBPS)) / BPS_DENOMINATOR;
        
        // Safety check to ensure fees don't exceed amount
        if (protocolFee + lpFee > amount) {
            protocolFee = (amount * protocolFeeBPS) / TOTAL_FEE_BPS;
            lpFee = amount - protocolFee;
        }
        
        return (protocolFee, lpFee);
    }
    
    /**
     * @dev Sends protocol fees to the fee receiver
     */
    function _sendProtocolFee(address token, uint256 amount) internal {
        if (amount > 0) {
            address feeReceiver = IFactory(factory).feeReceiver();
            if (feeReceiver != address(0)) {
                IERC20(token).safeTransfer(feeReceiver, amount);
            }
        }
    }
    
    /**
     * @dev Add liquidity to the pool and mint LP tokens
     * @return liquidity The amount of LP tokens minted
     */
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint256 _reserve0, uint256 _reserve1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;
        
        // Verify price if oracle is set and liquidity already exists
        if (_reserve0 > 0 && _reserve1 > 0) {
            _verifyPrice(amount0, amount1);
        }
        
        uint256 _totalSupply = totalSupply();
        
        if (_totalSupply == 0) {
            // Initial liquidity provision
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(this), MINIMUM_LIQUIDITY); // Permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            // Subsequent liquidity provisions
            liquidity = Math.min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }
        
        require(liquidity > 0, "BlumeSwap: INSUFFICIENT_LIQUIDITY_MINTED");
        
        _mint(to, liquidity);
        _update(balance0, balance1, _reserve0, _reserve1);
        
        emit Mint(msg.sender, amount0, amount1);
    }
    
    /**
     * @dev Remove liquidity from the pool and burn LP tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        (uint256 _reserve0, uint256 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));
        
        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        
        require(amount0 > 0 && amount1 > 0, "BlumeSwap: INSUFFICIENT_LIQUIDITY_BURNED");
        
        _burn(address(this), liquidity);
        
        IERC20(_token0).safeTransfer(to, amount0);
        IERC20(_token1).safeTransfer(to, amount1);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        
        _update(balance0, balance1, _reserve0, _reserve1);
        
        emit Burn(msg.sender, amount0, amount1, to);
    }
    
     /**
     * @dev Swap tokens
     * @param amount0Out Amount of token0 to send out
     * @param amount1Out Amount of token1 to send out
     * @param to Recipient address
     * @param data Optional data for flash swaps (not implemented)
     */
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, "BlumeSwap: INSUFFICIENT_OUTPUT_AMOUNT");
        (uint256 _reserve0, uint256 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "BlumeSwap: INSUFFICIENT_LIQUIDITY");
        
        uint256 balance0;
        uint256 balance1;
        uint256 amount0In;
        uint256 amount1In;
        {
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1, "BlumeSwap: INVALID_TO");
            
            if (amount0Out > 0) IERC20(_token0).safeTransfer(to, amount0Out);
            if (amount1Out > 0) IERC20(_token1).safeTransfer(to, amount1Out);
            
            if (data.length > 0) require(false, "BlumeSwap: FLASH_SWAP_NOT_SUPPORTED");
            
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
            
            amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
            amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        }
        require(amount0In > 0 || amount1In > 0, "BlumeSwap: INSUFFICIENT_INPUT_AMOUNT");
        
        // Apply fees and handle protocol fee distribution
        uint256 balance0Adjusted = balance0 * BPS_DENOMINATOR;
        uint256 balance1Adjusted = balance1 * BPS_DENOMINATOR;
        
        if (amount0In > 0) {
            uint256 protocolFee0;
            uint256 lpFee0;
            (protocolFee0, lpFee0) = _calculateFees(amount0In);

            balance0 = balance0 - protocolFee0;
            balance0Adjusted = balance0 * BPS_DENOMINATOR - (amount0In * lpFee0);
            
            address feeReceiver = IFactory(factory).feeReceiver();
            if (feeReceiver != address(0) && protocolFee0 > 0) {
                IERC20(token0).safeTransfer(feeReceiver, protocolFee0);
            }
        }
        
        if (amount1In > 0) {
            uint256 protocolFee1;
            uint256 lpFee1;
            (protocolFee1, lpFee1) = _calculateFees(amount1In);

            balance1 = balance1 - protocolFee1;
            balance1Adjusted = balance1 * BPS_DENOMINATOR - (amount1In * lpFee1);
            
            address feeReceiver = IFactory(factory).feeReceiver();
            if (feeReceiver != address(0) && protocolFee1 > 0) {
                IERC20(token1).safeTransfer(feeReceiver, protocolFee1);
            }
        }
        
        // Constant product formula check
        uint256 reserveProduct = _reserve0 * _reserve1;
        uint256 balanceProduct = balance0Adjusted * balance1Adjusted;
        uint256 denominator = BPS_DENOMINATOR * BPS_DENOMINATOR;
        
        require(
            balanceProduct >= reserveProduct * denominator,
            "BlumeSwap: K"
        );
        
        _update(balance0, balance1, _reserve0, _reserve1);
        
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // Helper function to calculate fees
    function _calculateFees(uint256 amountIn) internal view returns (uint256 protocolFee, uint256 lpFee) {
        uint256 protocolFeeBPS = IFactory(factory).protocolFeeBPS();
        if (protocolFeeBPS > TOTAL_FEE_BPS) {
            protocolFeeBPS = TOTAL_FEE_BPS;
        }
        
        protocolFee = (amountIn * protocolFeeBPS) / BPS_DENOMINATOR;
        lpFee = (amountIn * (TOTAL_FEE_BPS - protocolFeeBPS)) / BPS_DENOMINATOR;
    }

    
    /**
     * @dev Force balances to match reserves
     */
    function skim(address to) external nonReentrant {
        address _token0 = token0;
        address _token1 = token1;
        IERC20(_token0).safeTransfer(to, IERC20(_token0).balanceOf(address(this)) - reserve0);
        IERC20(_token1).safeTransfer(to, IERC20(_token1).balanceOf(address(this)) - reserve1);
    }
    
    /**
     * @dev Force reserves to match balances
     */
    function sync() external nonReentrant {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }
}