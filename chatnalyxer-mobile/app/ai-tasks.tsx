import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { aiService, Task } from '../src/services/aiService';

export default function AITasksScreen() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

    const fetchTasks = async () => {
        try {
            const data = await aiService.getTasks();
            setTasks(data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            Alert.alert('Error', 'Failed to load tasks');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTasks();
    }, []);

    const toggleTaskStatus = async (task: Task) => {
        const newStatus = task.status === 'pending' ? 'done' : 'pending';

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === task.id ? { ...t, status: newStatus } : t
        ));

        try {
            await aiService.updateTask(task.id, { status: newStatus });
        } catch (error) {
            console.error('Error updating task:', error);
            Alert.alert('Error', 'Failed to update task status');
            // Revert on error
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: task.status } : t
            ));
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return '#ef4444'; // Red
            case 'medium': return '#f59e0b'; // Amber
            case 'low': return '#10b981'; // Green
            default: return '#94a3b8'; // Slate
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        return task.status === filter;
    });

    const renderTask = ({ item }: { item: Task }) => {
        const isDone = item.status === 'done';

        return (
            <View style={[styles.taskCard, isDone && styles.taskCardDone]}>
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => toggleTaskStatus(item)}
                >
                    <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
                        {isDone && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                </TouchableOpacity>

                <View style={styles.taskContent}>
                    <Text style={[styles.taskText, isDone && styles.taskTextDone]}>
                        {item.task_description}
                    </Text>
                    <View style={styles.taskFooter}>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
                            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                                {item.priority.toUpperCase()}
                            </Text>
                        </View>
                        {item.deadline && (
                            <View style={styles.dateContainer}>
                                <MaterialIcons name="event" size={14} color="#94a3b8" />
                                <Text style={styles.dateText}>
                                    {new Date(item.deadline).toLocaleDateString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Source icon to show it's from AI/Chat */}
                <View style={styles.sourceContainer}>
                    <Ionicons name="sparkles" size={16} color="#8b5cf6" />
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Tasks</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsContainer}>
                {['all', 'pending', 'done'].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.tab, filter === f && styles.activeTab]}
                        onPress={() => setFilter(f as any)}
                    >
                        <Text style={[styles.tabText, filter === f && styles.activeTabText]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Task List */}
            <FlatList
                data={filteredTasks}
                renderItem={renderTask}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="checkmark-circle-outline" size={64} color="#334155" />
                            <Text style={styles.emptyText}>No tasks found</Text>
                            <Text style={styles.emptySubtext}>
                                Tasks generated from your chats will appear here.
                            </Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    tabsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
    },
    activeTab: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    tabText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
    },
    listContainer: {
        padding: 16,
    },
    taskCard: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    taskCardDone: {
        opacity: 0.6,
    },
    checkboxContainer: {
        marginRight: 12,
        justifyContent: 'flex-start',
        paddingTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#475569',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    taskContent: {
        flex: 1,
    },
    taskText: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 8,
        lineHeight: 22,
    },
    taskTextDone: {
        textDecorationLine: 'line-through',
        color: '#94a3b8',
    },
    taskFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: '700',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    sourceContainer: {
        justifyContent: 'flex-start',
        paddingTop: 4,
        paddingLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySubtext: {
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 250,
    },
});
