import { supabase } from '../lib/supabase';
import { ProjectTask, GanttItem } from '../types';

export interface ProjectData {
  id: string;
  title: string;
  goal: string;
  targetDate: string;
  tasks: ProjectTask[];
  ganttData?: GanttItem[] | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  lastModifiedBy?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export class ProjectService {
  // プロジェクト一覧を取得（自分が所有または参加しているプロジェクト）
  static async getProjects(): Promise<ProjectData[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('ログインが必要です');

    // 自分が所有しているプロジェクトと参加しているプロジェクトを取得
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members!inner(user_id)
      `)
      .or(`user_id.eq.${user.id},project_members.user_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`プロジェクトの取得に失敗しました: ${error.message}`);
    }

    return data.map(project => ({
      id: project.id,
      title: project.title,
      goal: project.goal,
      targetDate: project.target_date,
      tasks: project.tasks_data || [],
      ganttData: project.gantt_data,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      userId: project.user_id,
      lastModifiedBy: project.last_modified_by,
    }));
  }

  // プロジェクトを作成
  static async createProject(
    title: string,
    goal: string,
    targetDate: string,
    tasks: ProjectTask[] = [],
    ganttData?: GanttItem[] | null
  ): Promise<ProjectData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title,
        goal,
        target_date: targetDate,
        tasks_data: tasks,
        gantt_data: ganttData,
        last_modified_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`プロジェクトの作成に失敗しました: ${error.message}`);
    }

    // プロジェクト作成者をメンバーとして追加
    await supabase
      .from('project_members')
      .insert({
        project_id: data.id,
        user_id: user.id,
        role: 'owner',
      });

    return {
      id: data.id,
      title: data.title,
      goal: data.goal,
      targetDate: data.target_date,
      tasks: data.tasks_data || [],
      ganttData: data.gantt_data,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userId: data.user_id,
      lastModifiedBy: data.last_modified_by,
    };
  }

  // プロジェクトを更新（リアルタイム同期対応）
  static async updateProject(
    id: string,
    updates: {
      title?: string;
      goal?: string;
      targetDate?: string;
      tasks?: ProjectTask[];
      ganttData?: GanttItem[] | null;
    }
  ): Promise<ProjectData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    const updateData: any = {
      last_modified_by: user.id,
    };
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.goal !== undefined) updateData.goal = updates.goal;
    if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate;
    if (updates.tasks !== undefined) updateData.tasks_data = updates.tasks;
    if (updates.ganttData !== undefined) updateData.gantt_data = updates.ganttData;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`プロジェクトの更新に失敗しました: ${error.message}`);
    }

    return {
      id: data.id,
      title: data.title,
      goal: data.goal,
      targetDate: data.target_date,
      tasks: data.tasks_data || [],
      ganttData: data.gantt_data,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userId: data.user_id,
      lastModifiedBy: data.last_modified_by,
    };
  }

  // プロジェクトを削除
  static async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`プロジェクトの削除に失敗しました: ${error.message}`);
    }
  }

  // 特定のプロジェクトを取得
  static async getProject(id: string): Promise<ProjectData> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`プロジェクトの取得に失敗しました: ${error.message}`);
    }

    return {
      id: data.id,
      title: data.title,
      goal: data.goal,
      targetDate: data.target_date,
      tasks: data.tasks_data || [],
      ganttData: data.gantt_data,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userId: data.user_id,
      lastModifiedBy: data.last_modified_by,
    };
  }

  // プロジェクトメンバーを取得
  static async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profiles(email)
      `)
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`メンバーの取得に失敗しました: ${error.message}`);
    }

    return data.map(member => ({
      id: member.id,
      projectId: member.project_id,
      userId: member.user_id,
      email: member.profiles?.email || 'Unknown',
      role: member.role,
      joinedAt: member.joined_at,
    }));
  }

  // プロジェクトメンバーを追加
  static async addProjectMember(
    projectId: string,
    email: string,
    role: 'editor' | 'viewer' = 'editor'
  ): Promise<void> {
    // メールアドレスからユーザーIDを取得
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      throw new Error('指定されたメールアドレスのユーザーが見つかりません');
    }

    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userData.id,
        role,
      });

    if (error) {
      throw new Error(`メンバーの追加に失敗しました: ${error.message}`);
    }
  }

  // プロジェクトメンバーを削除
  static async removeProjectMember(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`メンバーの削除に失敗しました: ${error.message}`);
    }
  }

  // リアルタイム更新を購読
  static subscribeToProject(
    projectId: string,
    onUpdate: (payload: any) => void
  ) {
    return supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        onUpdate
      )
      .subscribe();
  }

  // リアルタイム更新の購読を解除
  static unsubscribeFromProject(projectId: string) {
    supabase.removeChannel(`project-${projectId}`);
  }

  // ユーザーの権限を確認
  static async getUserRole(projectId: string): Promise<'owner' | 'editor' | 'viewer' | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;
    return data.role;
  }
}