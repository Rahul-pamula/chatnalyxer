import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';

interface Group {
    id: string;
    name: string;
    avatar?: string;
    unreadCount?: number;
}

interface GroupStoriesProps {
    groups: Group[];
    onGroupPress: (groupId: string) => void;
    onAddPress?: () => void;
}

export default function GroupStories({ groups, onGroupPress, onAddPress }: GroupStoriesProps) {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Your Story / Add Group */}
                <TouchableOpacity style={styles.storyItem} onPress={onAddPress}>
                    <View style={[styles.storyCircle, styles.addStory]}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </View>
                    <Text style={styles.storyName}>Add</Text>
                </TouchableOpacity>

                {/* Group Stories */}
                {groups.map((group) => (
                    <TouchableOpacity
                        key={group.id}
                        style={styles.storyItem}
                        onPress={() => onGroupPress(group.id)}
                    >
                        <View style={[
                            styles.storyCircle,
                            group.unreadCount ? styles.unreadStory : null
                        ]}>
                            {group.avatar ? (
                                <Image source={{ uri: group.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {group.name ? group.name.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.storyName} numberOfLines={1}>
                            {group.name && group.name.length > 10 ? group.name.substring(0, 10) + '...' : (group.name || 'Unknown')}
                        </Text>
                        {group.unreadCount && group.unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{group.unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
    },
    storyItem: {
        alignItems: 'center',
        position: 'relative',
    },
    storyCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        marginBottom: 4,
    },
    unreadStory: {
        borderColor: colors.primary,
        borderWidth: 3,
    },
    addStory: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    avatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary + '40',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
    },
    storyName: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
        maxWidth: 70,
        textAlign: 'center',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: colors.error,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        paddingHorizontal: 4,
    },
});
