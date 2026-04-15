// src/hooks/useProjects.js
import { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api/index.js';
import { getApiError } from '../utils/helpers.js';
import toast from 'react-hot-toast';

export const useProjects = (params = {}) => {
  const [projects, setProjects]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchProjects = useCallback(async (p = params) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await projectsApi.getAll(p);
      setProjects(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetchProjects(params); }, []); // eslint-disable-line

  const createProject = async (formData) => {
    const { data } = await projectsApi.create(formData);
    setProjects(prev => [data.data, ...prev]);
    toast.success('Project created!');
    return data.data;
  };

  const updateProject = async (id, formData) => {
    const { data } = await projectsApi.update(id, formData);
    setProjects(prev => prev.map(p => p.projectId === id ? data.data : p));
    toast.success('Project updated.');
    return data.data;
  };

  const deleteProject = async (id) => {
    await projectsApi.delete(id);
    setProjects(prev => prev.filter(p => p.projectId !== id));
    toast.success('Project deleted.');
  };

  return { projects, pagination, loading, error, refetch: fetchProjects, createProject, updateProject, deleteProject };
};

// src/hooks/useTasks.js
export const useTasks = (projectId, params = {}) => {
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { tasksApi } = await import('../api/index.js');
      const { data } = await tasksApi.getByProject(projectId, params);
      setTasks(data.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]); // eslint-disable-line

  useEffect(() => { fetchTasks(); }, [projectId]); // eslint-disable-line

  const updateTaskStatus = async (taskId, status, sortOrder) => {
    const { tasksApi } = await import('../api/index.js');
    const { data } = await tasksApi.updateStatus(taskId, status, sortOrder);
    setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status } : t));
    return data;
  };

  const createTask = async (formData) => {
    const { tasksApi } = await import('../api/index.js');
    const { data } = await tasksApi.create(projectId, formData);
    setTasks(prev => [...prev, data.data]);
    toast.success('Task created!');
    return data.data;
  };

  const deleteTask = async (taskId) => {
    const { tasksApi } = await import('../api/index.js');
    await tasksApi.delete(taskId);
    setTasks(prev => prev.filter(t => t.taskId !== taskId));
    toast.success('Task deleted.');
  };

  return { tasks, setTasks, loading, error, refetch: fetchTasks, updateTaskStatus, createTask, deleteTask };
};

// src/hooks/useDashboard.js
export const useDashboard = () => {
  const [stats, setStats]             = useState(null);
  const [overview, setOverview]       = useState([]);
  const [taskSummary, setTaskSummary] = useState(null);
  const [activity, setActivity]       = useState([]);
  const [deadlines, setDeadlines]     = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { dashboardApi } = await import('../api/index.js');
        const [s, ov, ts, ac, dl] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getProjectOverview(),
          dashboardApi.getTaskSummary(),
          dashboardApi.getRecentActivity(15),
          dashboardApi.getUpcomingDeadlines(7),
        ]);
        setStats(s.data.data);
        setOverview(ov.data.data);
        setTaskSummary(ts.data.data);
        setActivity(ac.data.data);
        setDeadlines(dl.data.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { stats, overview, taskSummary, activity, deadlines, loading };
};
