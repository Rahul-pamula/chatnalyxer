import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Platform, Animated } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL } from '../src/config';
import AddEventModal from './_components/AddEventModal';

export default function CalendarScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const params = useLocalSearchParams();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Handle date parameter from URL (when navigating from message deadline)
        if (params.date && typeof params.date === 'string') {
            setSelectedDate(params.date);
        }

        fetchEvents();

        // Add timeout to prevent infinite loading
        const timeout = setTimeout(() => {
            if (loading) {
                setLoading(false);
                // Don't show error, just stop loading
                console.log('Calendar load timeout - continuing anyway');
            }
        }, 5000); // 5 second timeout

        return () => clearTimeout(timeout);
    }, [params.date]);

    // Trigger animations when loading is done (regardless of event count)
    useEffect(() => {
        if (!loading) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [loading]);

    const fetchEvents = async () => {
        try {
            setError(null);

            // Fetch both manual events and auto-created scheduled events
            const [manualResponse, scheduledResponse] = await Promise.all([
                fetch(`${BASE_URL}/events/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${BASE_URL}/events/scheduled`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (manualResponse.status === 401 || scheduledResponse.status === 401) {
                setError('Session expired - please login again');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            let allEvents: any[] = [];

            // Add manual events
            if (manualResponse.ok) {
                const manualData = await manualResponse.json();
                const manualEvents = (manualData.events || []).map((e: any) => ({
                    ...e,
                    source: e.source || 'manual',
                    event_date: e.event_date,
                    event_time: e.event_time
                }));
                allEvents = [...allEvents, ...manualEvents];
            }

            // Add scheduled events (from deadlines)
            if (scheduledResponse.ok) {
                const scheduledData = await scheduledResponse.json();
                console.log('📅 Scheduled events fetched:', scheduledData.events?.length || 0);
                const scheduledEvents = (scheduledData.events || []).map((e: any) => ({
                    ...e,
                    source: 'ai_detected',
                    // Convert deadline to event_date and event_time for consistent display
                    event_date: e.deadline ? new Date(e.deadline).toISOString().split('T')[0] : null,
                    event_time: e.deadline ? new Date(e.deadline).toTimeString().slice(0, 5) : null,
                    deadline: e.deadline
                }));
                allEvents = [...allEvents, ...scheduledEvents];
            }

            console.log('📊 Total events loaded:', allEvents.length);
            setEvents(allEvents);
        } catch (error: any) {
            console.error('Error fetching events:', error);
            setError(error.message || 'Failed to load events');
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
        if (date && !markedDates[date]) {
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

            {/* Modern Header */}
            <View style={styles.modernHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.modernHeaderTitle}>Calendar</Text>
                <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
                    <Ionicons name="add-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading events...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            setLoading(true);
                            setError(null);
                            fetchEvents();
                        }}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >

                    {/* Calendar */}
                    <Animated.View style={[styles.calendarContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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
                    </Animated.View>

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
                            .filter(e => e.event_date && new Date(e.event_date) >= new Date())
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
    modernHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        ...shadows.sm,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: colors.surface,
    },
    modernHeaderTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        flex: 1,
        textAlign: 'center',
    },
    addButton: {
        padding: 4,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 16,
        color: colors.error,
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    quickEventButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        margin: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    quickEventText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
