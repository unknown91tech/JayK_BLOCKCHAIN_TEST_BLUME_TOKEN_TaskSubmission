import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useContract } from '@/hooks/useContract';
import { useToast } from '@/hooks/use-toast';
import { Play, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { SecurityTester } from './SecurityTester';
import { YieldStrategyTester } from './YieldStrategyTester';

export function TestSuite() {
  const {
    testTokenOperations,
    testDEXOperations,
    testStakingFeatures,
    testVaultOperations,
    runSecurityTests,
    testYieldStrategies,
    isExecuting
  } = useContract();
  
  const { toast } = useToast();
  const [testResults, setTestResults] = useState({});
  const [activeTest, setActiveTest] = useState(null);
  const [overallProgress, setOverallProgress] = useState(0);

  const testSuites = [
    {
      id: 'token',
      name: 'Token Operations',
      description: 'ERC-20 compliance, minting, burning, transfers',
      testFn: testTokenOperations,
      icon: '🪙'
    },
    {
      id: 'dex',
      name: 'DEX Operations',
      description: 'Liquidity management, swaps, AMM logic',
      testFn: testDEXOperations,
      icon: '🔄'
    },
    {
      id: 'staking',
      name: 'Staking Features',
      description: 'Liquid staking, rewards, tiers',
      testFn: testStakingFeatures,
      icon: '🥩'
    },
    {
      id: 'vault',
      name: 'Vault Operations',
      description: 'Deposits, withdrawals, yield generation',
      testFn: testVaultOperations,
      icon: '🏛️'
    },
    {
      id: 'security',
      name: 'Security Tests',
      description: 'Access control, pause mechanisms, limits',
      testFn: runSecurityTests,
      icon: '🔒'
    },
    {
      id: 'yield',
      name: 'Yield Strategies',
      description: 'Complete yield farming workflows',
      testFn: testYieldStrategies,
      icon: '🌾'
    }
  ];

  const runTest = async (testSuite) => {
    setActiveTest(testSuite.id);
    
    try {
      const results = await testSuite.testFn();
      setTestResults(prev => ({
        ...prev,
        [testSuite.id]: {
          results,
          passed: results.filter(r => r.passed).length,
          total: results.length,
          timestamp: new Date()
        }
      }));
      
      toast({
        title: `${testSuite.name} Complete`,
        description: `${results.filter(r => r.passed).length}/${results.length} tests passed`,
      });
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testSuite.id]: {
          error: error.message,
          timestamp: new Date()
        }
      }));
      
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActiveTest(null);
    }
  };

  const runAllTests = async () => {
    for (const testSuite of testSuites) {
      await runTest(testSuite);
      // Update progress
      const completed = Object.keys(testResults).length + 1;
      setOverallProgress((completed / testSuites.length) * 100);
    }
  };

  const getTestStatus = (suiteId) => {
    const result = testResults[suiteId];
    if (!result) return 'pending';
    if (result.error) return 'error';
    if (result.passed === result.total) return 'success';
    if (result.passed > 0) return 'partial';
    return 'failed';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'partial': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Play className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status, result) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">{result.passed}/{result.total}</Badge>;
      case 'partial':
        return <Badge variant="destructive">{result.passed}/{result.total}</Badge>;
      case 'failed':
        return <Badge variant="destructive">0/{result.total}</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Suite Dashboard</CardTitle>
          <CardDescription>Comprehensive testing for the Blume DeFi ecosystem</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Overall Progress</h3>
              <Button 
                onClick={runAllTests} 
                disabled={isExecuting}
                className="flex items-center gap-2"
              >
                {isExecuting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run All Tests
              </Button>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {Object.keys(testResults).length} of {testSuites.length} test suites completed
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="yield">Yield Strategies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testSuites.map((testSuite) => {
              const status = getTestStatus(testSuite.id);
              const result = testResults[testSuite.id];
              const isActive = activeTest === testSuite.id;

              return (
                <Card key={testSuite.id} className={isActive ? 'ring-2 ring-primary' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{testSuite.icon}</span>
                        <div>
                          <CardTitle className="text-base">{testSuite.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {testSuite.description}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusIcon(status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status</span>
                        {getStatusBadge(status, result)}
                      </div>
                      
                      {result && result.timestamp && (
                        <div className="text-xs text-muted-foreground">
                          Last run: {result.timestamp.toLocaleTimeString()}
                        </div>
                      )}
                      
                      {result && result.error && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          Error: {result.error}
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runTest(testSuite)}
                        disabled={isExecuting}
                        className="w-full"
                      >
                        {isActive ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-2" />
                            Run Test
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                  
                  {result && result.results && (
                    <CardContent className="pt-0">
                      <div className="text-xs space-y-1">
                        <h4 className="font-medium text-sm">Test Results:</h4>
                        {result.results.map((test, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="truncate">{test.test}</span>
                            {test.passed ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <SecurityTester />
        </TabsContent>

        {/* <TabsContent value="performance">
          <PerformanceTester />
        </TabsContent> */}

        <TabsContent value="yield">
          <YieldStrategyTester />
        </TabsContent>
      </Tabs>
    </div>
  );
}