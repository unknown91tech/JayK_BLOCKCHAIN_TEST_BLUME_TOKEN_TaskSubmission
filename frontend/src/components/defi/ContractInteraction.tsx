import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Info, Code, PlayCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useContract } from '@/hooks/useContract';
import { toast } from '@/hooks/use-toast';
import { MOCK_CONTRACTS } from '@/lib/web3/mockContracts';
import { formatAddress } from '@/lib/web3/networks';
import { ContractAction, ContractInput } from '@/lib/web3/types';

export function ContractInteraction() {
  const { mockContractCall, isExecuting } = useContract();
  const [selectedContract, setSelectedContract] = useState(MOCK_CONTRACTS[0].address);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Get the selected contract
  const contract = MOCK_CONTRACTS.find(c => c.address === selectedContract);
  
  // Get the selected action
  const action = contract?.actions.find(a => a.name === selectedAction);

  // Reset input values when changing contract or action
  const handleContractChange = (address: string) => {
    setSelectedContract(address);
    setSelectedAction(null);
    setInputValues({});
  };

  const handleActionChange = (name: string) => {
    setSelectedAction(name);
    setInputValues({});
  };

  // Update input value
  const updateInputValue = (name: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Execute contract action
  const executeAction = async () => {
    if (!contract || !action) {
      toast({
        title: "Invalid Selection",
        description: "Please select a contract and action",
        variant: "destructive",
      });
      return;
    }

    // Check if all required inputs are filled
    const missingInputs = action.inputs.filter(input => !inputValues[input.name]);
    if (missingInputs.length > 0) {
      toast({
        title: "Missing Inputs",
        description: `Please fill in all required inputs: ${missingInputs.map(i => i.name).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert inputs to the correct format based on type
      const params = action.inputs.map(input => {
        const value = inputValues[input.name];
        if (input.type === 'uint256') {
          return value; // In a real implementation, we would use ethers.parseUnits
        }
        return value;
      });

      // Execute the contract call
      await mockContractCall(
        contract.address,
        action,
        params
      );

      toast({
        title: "Transaction Sent",
        description: `Successfully executed ${action.name}`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Transaction Failed",
        description: "Failed to execute the contract function",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Interaction</CardTitle>
        <CardDescription>Interact directly with smart contracts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Contract</label>
          <Select
            value={selectedContract}
            onValueChange={handleContractChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a contract" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_CONTRACTS.map((contract) => (
                <SelectItem key={contract.address} value={contract.address}>
                  <div className="flex flex-col">
                    <span>{contract.name}</span>
                    <span className="text-xs text-muted-foreground">{formatAddress(contract.address)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contract Details */}
        {contract && (
          <div className="bg-muted/40 p-4 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{contract.name}</h3>
              <Badge variant="outline">{formatAddress(contract.address)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{contract.description}</p>
            
            <Separator className="my-4" />
            
            {/* Available Actions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Functions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {contract.actions.map((action) => (
                  <Button
                    key={action.name}
                    variant={selectedAction === action.name ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                    onClick={() => handleActionChange(action.name)}
                  >
                    <div className="flex items-center">
                      <Code className="mr-2 h-4 w-4" />
                      <span>{action.name}</span>
                      <Badge 
                        variant="outline" 
                        className="ml-2 text-xs"
                        style={{ 
                          backgroundColor: action.stateMutability === 'view' 
                            ? 'transparent' 
                            : action.stateMutability === 'payable' 
                              ? 'rgba(245, 158, 11, 0.1)' 
                              : 'rgba(96, 165, 250, 0.1)',
                          color: action.stateMutability === 'view' 
                            ? 'var(--muted-foreground)' 
                            : action.stateMutability === 'payable' 
                              ? 'rgba(245, 158, 11, 1)' 
                              : 'rgba(96, 165, 250, 1)'
                        }}
                      >
                        {action.stateMutability}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Function Inputs */}
        {action && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-medium">{action.name}</h3>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <p className="text-sm text-muted-foreground">{action.description}</p>
            
            {action.inputs.length > 0 ? (
              <Accordion type="single" collapsible defaultValue="params">
                <AccordionItem value="params" className="border-none">
                  <AccordionTrigger className="py-2">Function Parameters</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {action.inputs.map((input) => (
                        <FunctionInput
                          key={input.name}
                          input={input}
                          value={inputValues[input.name] || ''}
                          onChange={(value) => updateInputValue(input.name, value)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <p className="text-sm">This function doesn't require any inputs</p>
            )}
            
            <Button 
              onClick={executeAction}
              disabled={isExecuting}
              className="w-full mt-2"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {isExecuting 
                ? 'Executing...' 
                : `Execute ${action.name}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FunctionInputProps {
  input: ContractInput;
  value: string;
  onChange: (value: string) => void;
}

function FunctionInput({ input, value, onChange }: FunctionInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <label className="text-sm font-medium">{input.name}</label>
        <Badge variant="outline" className="ml-2 text-xs">{input.type}</Badge>
      </div>
      {input.description && (
        <p className="text-xs text-muted-foreground">{input.description}</p>
      )}
      <Input
        placeholder={`Enter ${input.name} (${input.type})`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}