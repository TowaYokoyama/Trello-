import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
import apiClient from '../../src/api/client';
import { useFocusEffect } from 'expo-router';

// --- 型定義 ---
interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- データ取得 ---
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/api/tasks/');
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
      Alert.alert('Error', 'Could not fetch tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  // 画面が表示されるたびにデータを再取得
  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  // --- イベントハンドラ ---
  const handleAddTask = async () => {
    if (newTaskTitle.trim() === '') return;
    try {
      const response = await apiClient.post('/api/tasks/', { title: newTaskTitle });
      setTasks([...tasks, response.data]);
      setNewTaskTitle('');
    } catch (error) {
      console.error('Failed to add task', error);
      Alert.alert('Error', 'Could not add task.');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updatedTask = { ...task, completed: !task.completed };
      await apiClient.put(`/api/tasks/${task.id}`, { completed: updatedTask.completed });
      setTasks(tasks.map(t => (t.id === task.id ? updatedTask : t)));
    } catch (error) {
      console.error('Failed to update task', error);
      Alert.alert('Error', 'Could not update task.');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await apiClient.delete(`/api/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task', error);
      Alert.alert('Error', 'Could not delete task.');
    }
  };

  // --- レンダリング ---
  if (isLoading) {
    return <ActivityIndicator style={tw`mt-10`} size="large" />;
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* 新規タスク追加フォーム */}
      <View style={tw`p-4 bg-white border-b border-gray-200`}>
        <TextInput
          style={tw`border border-gray-300 rounded-lg p-3 mb-2`}
          placeholder="Add a new task..."
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
        />
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-lg p-3`}
          onPress={handleAddTask}
        >
          <Text style={tw`text-white text-center font-bold`}>Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* タスク一覧 */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={tw`flex-row items-center p-4 bg-white border-b border-gray-100`}>
            <TouchableOpacity onPress={() => handleToggleComplete(item)} style={tw`flex-row items-center flex-1`}>
              <View style={tw`w-6 h-6 rounded-full border-2 ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-400'}`} />
              <Text style={tw`ml-4 text-lg ${item.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                {item.title}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteTask(item.id)} style={tw`p-2`}>
              <Text style={tw`text-red-500`}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
