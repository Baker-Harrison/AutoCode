import React, { useState, useEffect } from 'react';

type Props = {
  sessionId?: string;
};

const ExecutionMonitor: React.FC<Props> = ({ sessionId }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [toolExecutions, setToolExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionData();
    const interval = setInterval(loadSessionData, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      if (sessionId) {
        const [tasksData, execsData] = await Promise.all([
          window.ide.workflowGetTasks(sessionId),
          window.ide.workflowGetToolExecutions(sessionId, 50)
        ]);
        setTasks(tasksData);
        setToolExecutions(execsData);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading execution data:', error);
      setLoading(false);
    }
  };

  const handlePauseTask = async (taskId: string) => {
    try {
      await window.ide.workflowPauseTask(taskId);
      loadSessionData();
    } catch (error) {
      console.error('Error pausing task:', error);
    }
  };

  const handleResumeTask = async (taskId: string) => {
    try {
      await window.ide.workflowResumeTask(taskId);
      loadSessionData();
    } catch (error) {
      console.error('Error resuming task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'text-gray-400',
      running: 'text-green-400',
      paused: 'text-yellow-400',
      completed: 'text-blue-400',
      failed: 'text-red-400',
      blocked: 'text-orange-400',
      awaiting_approval: 'text-purple-400'
    };
    return colors[status] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading execution data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Execution Monitor</h2>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Tasks</h3>
          {tasks.length === 0 ? (
            <div className="text-gray-500 text-sm">No tasks</div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-gray-900 border border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{task.title}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Status: <span className={getStatusColor(task.status)}>{task.status}</span>
                      </div>
                      {task.agentId && (
                        <div className="text-xs text-gray-500">Agent: {task.agentId}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(task.status === 'running' || task.status === 'queued') && (
                        <button
                          onClick={() => handlePauseTask(task.id)}
                          className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 text-white rounded"
                        >
                          Pause
                        </button>
                      )}
                      {task.status === 'paused' && (
                        <button
                          onClick={() => handleResumeTask(task.id)}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded"
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Tool Executions</h3>
          {toolExecutions.length === 0 ? (
            <div className="text-gray-500 text-sm">No tool executions</div>
          ) : (
            <div className="space-y-2">
              {toolExecutions.slice(0, 20).map((exec) => {
                const latency = exec.completedAt
                  ? new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()
                  : null;

                return (
                  <div
                    key={exec.id}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-medium">{exec.toolName}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Status: <span className={getStatusColor(exec.status)}>{exec.status}</span>
                        </div>
                        {latency && (
                          <div className="text-xs text-gray-500">
                            Latency: {latency}ms
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(exec.startedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionMonitor;
