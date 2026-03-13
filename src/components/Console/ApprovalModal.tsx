import React from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import { LiveAgentService } from '../../services/LiveAgentService';

const ApprovalModal: React.FC = () => {
  const { approvalRequest, setApprovalRequest } = useAgentStore();

  if (!approvalRequest) return null;

  const handleAction = (action: 'approve' | 'reject') => {
    LiveAgentService.getInstance().sendCommand(
      approvalRequest.agentId,
      action,
      {
        toolCallId: approvalRequest.toolCallId,
        feedback: action === 'reject' ? 'User rejected via console' : undefined
      }
    );
    setApprovalRequest(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[500px] border-2 border-yellow-600 bg-stone-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-2xl font-bold text-yellow-500">
          ⚠️ 御批请求 (Imperial Approval)
        </h2>
        
        <div className="mb-6 space-y-3 text-stone-300">
          <div className="flex justify-between">
            <span className="text-stone-500">申请人 (Agent):</span>
            <span className="font-mono text-yellow-200">{approvalRequest.agentId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">拟执行 (Function):</span>
            <span className="font-mono text-blue-300">{approvalRequest.functionName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">风险等级 (Risk):</span>
            <span className={`font-bold ${approvalRequest.riskLevel === 'high' ? 'text-red-500' : 'text-orange-400'}`}>
              {approvalRequest.riskLevel.toUpperCase()}
            </span>
          </div>
          
          <div className="mt-4 rounded border border-stone-700 bg-stone-800 p-3">
            <div className="mb-2 text-xs text-stone-500">参数详情 (Arguments):</div>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-stone-400">
              {JSON.stringify(approvalRequest.args, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleAction('reject')}
            className="flex-1 border border-red-800 bg-red-900/20 py-2 text-red-400 hover:bg-red-900/40"
          >
            驳回 (Reject)
          </button>
          <button
            onClick={() => handleAction('approve')}
            className="flex-1 bg-yellow-600 py-2 text-stone-900 font-bold hover:bg-yellow-500"
          >
            准奏 (Approve)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;
