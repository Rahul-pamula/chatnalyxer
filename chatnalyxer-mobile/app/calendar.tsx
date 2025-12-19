import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL } from '../src/config';
import AddEventModal from './components/AddEventModal';

export default function CalendarScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetch(`${BASE_URL}/events`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setEvents(data.events || []);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchEvents();
    };

    const handleAddEvent = async (eventData: any) => {
        try {
            const response = await fetch(`${BASE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            if (response.ok) {
                Alert.alert('Success', 'Event created successfully!');
                setShowAddModal(false);
                fetchEvents(); // Refresh events list
            } else {
                Alert.alert('Error', 'Failed to create event');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            Alert.alert('Error', 'Failed to create event');
        }
    };

    // Create marked dates object for calendar
    const markedDates: any = {};
    events.forEach((event: any) => {
        const date = event.event_date;
        if (!markedDates[date]) {
            markedDates[date] = { marked: true, dots: [] };
        }
    });

    // Highlight selected date
    if (markedDates[selectedDate]) {
        markedDates[selectedDate].selected = true;
        markedDates[selectedDate].selectedColor = colors.primary;
    } else {
        markedDates[selectedDate] = { selected: true, selectedColor: colors.primary };
    }

    // Filter events for selected date
    const selectedDateEvents = events.filter((e: any) => e.event_date === selectedDate);

    const handleDeleteEvent = async (eventId: number) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to delete this event?');
            if (confirmed) {
                await deleteEventAPI(eventId);
            }
        } else {
            Alert.alert(
                'Delete Event',
                'Are you sure you want to delete this event?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteEventAPI(eventId)
                    }
                ]
            );
        }
    };

    const deleteEventAPI = async (eventId: number) => {
        try {
            const response = await fetch(`${BASE_URL}/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                setEvents(events.filter(e => e.id !== eventId));
                if (Platform.OS !== 'web') {
                    Alert.alert('Success', 'Event deleted');
                }
            } else {
                if (Platform.OS !== 'web') Alert.alert('Error', 'Failed to delete event');
                else alert('Failed to delete event');
            }
        } catch (error) {
            if (Platform.OS !== 'web') Alert.alert('Error', 'Failed to delete event');
            else alert('Failed to delete event');
        }
    };

    const renderEventCard = (event: any) => (
        <TouchableOpacity
            key={event.id}
            style={styles.eventCard}
            onPress={() => {/* Navigate to event details */ }}
        >
            <View style={styles.eventHeader}>
                <View style={styles.eventTimeContainer}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={styles.eventTime}>
                        {event.event_time ? event.event_time.slice(0, 5) : 'All Day'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {event.source === 'ai_detected' && (
                        <View style={styles.aiBadge}>
                            <Ionicons name="sparkles" size={12} color={colors.primary} />
                            <Text style={styles.aiBadgeText}>AI</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => handleDeleteEvent(event.id)}>
                        <Ionicons name="trash-outline" size={18} color={colors.error || '#FF3B30'} />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.eventTitle}>{event.title}</Text>

            {event.description && (
                <Text style={styles.eventDescription} numberOfLines={2}>
                    {event.description}
                </Text>
            )}

            {event.location && (
                <View style={styles.eventLocation}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.locationText}>{event.location}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Calendar</Text>
                <TouchableOpacity onPress={() => setShowAddModal(true)}>
                    <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading events...</Text>
                </View>
            ) : (
                <ScrollView
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Calendar */}
                    <View style={styles.calendarContainer}>
                        <Calendar
                            current={selectedDate}
                            onDayPress={(day) => setSelectedDate(day.dateString)}
                            markedDates={markedDates}
                            theme={{
                                backgroundColor: '#ffffff',
                                calendarBackground: '#ffffff',
                                textSectionTitleColor: colors.textSecondary,
                                selectedDayBackgroundColor: colors.primary,
                                selectedDayTextColor: '#ffffff',
                                todayTextColor: colors.primary,
                                dayTextColor: colors.textPrimary,
                                textDisabledColor: '#d9e1e8',
                                dotColor: colors.primary,
                                selectedDotColor: '#ffffff',
                                arrowColor: colors.primary,
                                monthTextColor: colors.textPrimary,
                                textMonthFontWeight: 'bold',
                                textDayFontSize: 16,
                                textMonthFontSize: 18,
                            }}
                        />
                    </View>

                    {/* Events for Selected Date */}
                    <View style={styles.eventsSection}>
                        <Text style={styles.sectionTitle}>
                            Events on {new Date(selectedDate).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Text>

                        {selectedDateEvents.length === 0 ? (
                            <View style={styles.noEventsContainer}>
                                <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
                                <Text style={styles.noEventsText}>No events on this day</Text>
                            </View>
                        ) : (
                            selectedDateEvents.map(renderEventCard)
                        )}
                    </View>

                    {/* Upcoming Events */}
                    <View style={styles.eventsSection}>
                        <Text style={styles.sectionTitle}>Upcoming Events</Text>
                        {events
                            .filter(e => new Date(e.event_date) >= new Date())
                            .slice(0, 5)
                            .map(renderEventCard)
                        }
                    </View>
                </ScrollView>
            )}

            {/* Add Event Modal */}
            <AddEventModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSave={handleAddEvent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: colors.textSecondary,
        fontSize: 16,
    },
    calendarContainer: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        margin: 16,
        padding: 8,
        ...shadows.md,
    },
    eventsSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    eventCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        ...shadows.sm,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    eventTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    eventTime: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primary + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    aiBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 6,
    },
    eventDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 8,
    },
    eventLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    noEventsContainer: {
        alignItems: 'center',
        padding: 32,
    },
    noEventsText: {
        marginTop: 12,
        fontSize: 16,
        color: colors.textSecondary,
    },
});
