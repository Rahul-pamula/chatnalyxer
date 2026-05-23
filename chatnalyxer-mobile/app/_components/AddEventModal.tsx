import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, shadows } from '../../src/theme/colors';

interface AddEventModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (event: any) => void;
}

export default function AddEventModal({ visible, onClose, onSave }: AddEventModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventDate, setEventDate] = useState(new Date());
    const [eventTime, setEventTime] = useState(new Date());
    const [location, setLocation] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isAllDay, setIsAllDay] = useState(false);
    const [isAlarm, setIsAlarm] = useState(false);

    const handleSave = () => {
        if (!title.trim()) {
            alert('Please enter an event title');
            return;
        }

        const event = {
            title: title.trim(),
            description: description.trim(),
            event_date: eventDate.toISOString().split('T')[0],
            event_time: isAllDay ? null : eventTime.toTimeString().slice(0, 5),
            location: location.trim() || null,
            is_all_day: isAllDay,
            reminder_minutes: isAlarm ? 0 : 30,
            is_alarm: isAlarm
        };

        onSave(event);

        // Reset form
        setTitle('');
        setDescription('');
        setEventDate(new Date());
        setEventTime(new Date());
        setLocation('');
        setIsAllDay(false);
        setIsAlarm(false);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add New Event</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formContainer}>
                        {/* Title */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title *</Text>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Event title"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        {/* Description */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Event description"
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Date */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date *</Text>
                            {Platform.OS === 'web' ? (
                                // Web-specific Date Input
                                <input
                                    type="date"
                                    style={{
                                        padding: 12,
                                        fontSize: 16,
                                        borderRadius: 12,
                                        border: `1px solid ${colors.border}`,
                                        backgroundColor: colors.background,
                                        color: colors.textPrimary,
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    }}
                                    value={eventDate.toISOString().split('T')[0]}
                                    onChange={(e: any) => setEventDate(new Date(e.target.value))}
                                />
                            ) : (
                                // Native Date Picker Trigger
                                <>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                        <Text style={styles.dateText}>
                                            {eventDate.toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    </TouchableOpacity>

                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={eventDate}
                                            mode="date"
                                            display="default"
                                            onChange={(event, date) => {
                                                setShowDatePicker(false);
                                                if (date) setEventDate(date);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </View>

                        {/* All Day Toggle */}
                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() => setIsAllDay(!isAllDay)}
                        >
                            <Text style={styles.label}>All Day Event</Text>
                            <View style={[styles.toggle, isAllDay && styles.toggleActive]}>
                                {isAllDay && <View style={styles.toggleDot} />}
                            </View>
                        </TouchableOpacity>

                        {/* Alarm Mode Toggle */}
                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() => setIsAlarm(!isAlarm)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="alarm-outline" size={20} color={colors.primary} />
                                <Text style={styles.label}>Alarm (notify at exact time)</Text>
                            </View>
                            <View style={[styles.toggle, isAlarm && styles.toggleActive]}>
                                {isAlarm && <View style={styles.toggleDot} />}
                            </View>
                        </TouchableOpacity>

                        {/* Time (if not all day) */}
                        {!isAllDay && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Time</Text>
                                {Platform.OS === 'web' ? (
                                    // Web-specific Time Input
                                    <input
                                        type="time"
                                        style={{
                                            padding: 12,
                                            fontSize: 16,
                                            borderRadius: 12,
                                            border: `1px solid ${colors.border}`,
                                            backgroundColor: colors.background,
                                            color: colors.textPrimary,
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                        value={eventTime.toTimeString().slice(0, 5)}
                                        onChange={(e: any) => {
                                            const [hours, minutes] = e.target.value.split(':');
                                            const newTime = new Date(eventTime);
                                            newTime.setHours(parseInt(hours), parseInt(minutes));
                                            setEventTime(newTime);
                                        }}
                                    />
                                ) : (
                                    // Native Time Picker Trigger
                                    <>
                                        <TouchableOpacity
                                            style={styles.dateButton}
                                            onPress={() => setShowTimePicker(true)}
                                        >
                                            <Ionicons name="time-outline" size={20} color={colors.primary} />
                                            <Text style={styles.dateText}>
                                                {eventTime.toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Text>
                                        </TouchableOpacity>

                                        {showTimePicker && (
                                            <DateTimePicker
                                                value={eventTime}
                                                mode="time"
                                                display="default"
                                                onChange={(event, time) => {
                                                    setShowTimePicker(false);
                                                    if (time) setEventTime(time);
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                            </View>
                        )}

                        {/* Location */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Location</Text>
                            <TextInput
                                style={styles.input}
                                value={location}
                                onChangeText={setLocation}
                                placeholder="Event location"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>Save Event</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        ...shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    formContainer: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateText: {
        fontSize: 16,
        color: colors.textPrimary,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.border,
        justifyContent: 'center',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: colors.primary,
        alignItems: 'flex-end',
    },
    toggleDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFF',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderColor: colors.border,
    },
    button: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.background,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    saveButton: {
        backgroundColor: colors.primary,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});
