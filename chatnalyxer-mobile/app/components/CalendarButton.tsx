import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as Calendar from 'expo-calendar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

interface CalendarButtonProps {
    title: string;
    deadline: string; // ISO string
}

export function CalendarButton({ title, deadline }: CalendarButtonProps) {

    useEffect(() => {
        (async () => {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status === 'granted') {
                // await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            }
        })();
    }, []);

    const addToCalendar = async () => {
        try {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'We need permission to add this to your calendar.');
                return;
            }

            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            const defaultCalendar = Platform.OS === 'ios'
                ? calendars.find(cal => cal.source && cal.source.name === 'Default') || calendars[0]
                : calendars.find(cal => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER) || calendars[0];

            if (!defaultCalendar) {
                Alert.alert('Error', 'No calendar found to add event to.');
                return;
            }

            const date = new Date(deadline);
            // End date = start date + 1 hour (default)
            const endDate = new Date(date.getTime() + 60 * 60 * 1000);

            await Calendar.createEventAsync(defaultCalendar.id, {
                title: `[Study] ${title}`,
                startDate: date,
                endDate: endDate,
                timeZone: 'GMT',
                location: 'Added via Chatnalyxer',
                notes: 'Generated from WhatsApp group chat.'
            });

            Alert.alert('Success', 'Added to your calendar!');
        } catch (e) {
            console.log(e);
            Alert.alert('Error', 'Failed to add event.');
        }
    };

    return (
        <Pressable
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
            onPress={addToCalendar}
        >
            <Ionicons name="calendar-outline" size={14} color="#FFF" />
            <Text style={styles.text}>Add to Cal</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFF',
    }
});
