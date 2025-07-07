import React, { useState, useEffect } from 'react';
import { ProjectService, ProjectMember } from '../services/projectService';
import { XIcon, PlusIcon, TrashIcon, ResponsibleIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  userRole: 'owner' | 'editor' | 'viewer' | null;
}

const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  projectId,
  userRole,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'editor' | 'viewer'>('editor');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const loadMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const memberList = await ProjectService.getProjectMembers(projectId);
      setMembers(memberList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンバーの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, projectId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setIsAddingMember(true);
    setError(null);
    try {
      await ProjectService.addProjectMember(projectId, newMemberEmail, newMemberRole);
      setNewMemberEmail('');
      setNewMemberRole('editor');
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンバーの追加に失敗しました');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('このメンバーをプロジェクトから削除しますか？')) {
      return;
    }

    try {
      await ProjectService.removeProjectMember(projectId, userId);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンバーの削除に失敗しました');
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner': return 'オーナー';
      case 'editor': return '編集者';
      case 'viewer': return '閲覧者';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 flex items-center">
            <ResponsibleIcon className="w-6 h-6 mr-2 text-blue-600" />
            プロジェクトメンバー
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-100"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow p-6 overflow-y-auto">
          {error && <ErrorMessage message={error} />}
          
          {userRole === 'owner' && (
            <form onSubmit={handleAddMember} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-800 mb-3">新しいメンバーを招待</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="メールアドレス"
                  className="flex-grow px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as 'editor' | 'viewer')}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="editor">編集者</option>
                  <option value="viewer">閲覧者</option>
                </select>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-400"
                >
                  {isAddingMember ? <LoadingSpinner size="sm" color="border-white" /> : <PlusIcon className="w-4 h-4" />}
                  招待
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text="メンバーを読み込み中..." />
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800">現在のメンバー ({members.length}名)</h4>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{member.email}</p>
                      <p className="text-xs text-slate-500">
                        参加日: {new Date(member.joinedAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(member.role)}`}>
                      {getRoleDisplayName(member.role)}
                    </span>
                    {userRole === 'owner' && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-1 text-red-500 hover:text-red-700 rounded"
                        title="メンバーを削除"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-center text-slate-500 py-8">メンバーがいません</p>
              )}
            </div>
          )}
        </div>

        <footer className="p-6 bg-slate-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProjectMembersModal;