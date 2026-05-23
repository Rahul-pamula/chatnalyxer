import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Audio } from 'expo-av';
import { AppState, AppStateStatus } from 'react-native';

interface AlarmContextType {
    isRinging: boolean;
    snoozeCount: number;
    triggerAlarm: (message?: string) => void;
    stopAlarm: () => void;
    snoozeAlarm: () => void;
    alarmMessage: string;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

export const AlarmProvider = ({ children }: { children: ReactNode }) => {
    const [isRinging, setIsRinging] = useState(false);
    const [snoozeCount, setSnoozeCount] = useState(0);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [alarmMessage, setAlarmMessage] = useState('Alarm!');
    const [snoozeTimeout, setSnoozeTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    // Play the alarm sound
    const playSound = async () => {
        try {
            // Stop any existing sound
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }

            // Load and play the sound
            const { sound: newSound } = await Audio.Sound.createAsync(
                require('../../assets/sounds/alarm.mp3'),
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
            setSound(newSound);
            setIsRinging(true);
        } catch (error) {
            console.error("Failed to play alarm sound", error);
            setIsRinging(true); // Still show the modal even if sound fails
        }
    };

    const triggerAlarm = (message: string = 'Alarm!') => {
        setAlarmMessage(message);
        if (snoozeTimeout) {
            clearTimeout(snoozeTimeout);
            setSnoozeTimeout(null);
        }
        playSound();
    };

    const stopAlarm = async () => {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
        }
        setIsRinging(false);
        setSnoozeCount(0); // Reset snooze count when stopped
        if (snoozeTimeout) {
            clearTimeout(snoozeTimeout);
            setSnoozeTimeout(null);
        }
    };

    const snoozeAlarm = async () => {
        if (snoozeCount >= 3) return; // Prevent snoozing more than 3 times

        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
        }

        setIsRinging(false);
        setSnoozeCount((prev) => prev + 1);

        // Set 5-minute timer (5 * 60 * 1000 = 300,000 ms)
        const timeout = setTimeout(() => {
            triggerAlarm(alarmMessage);
        }, 5 * 60 * 1000);

        setSnoozeTimeout(timeout);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
            if (snoozeTimeout) {
                clearTimeout(snoozeTimeout);
            }
        };
    }, [sound, snoozeTimeout]);

    // Optionally stop alarm if app goes to background (user decides if foreground strictly)
    // But we want it to keep ringing if screen is active.

    return (
        <AlarmContext.Provider value={{ isRinging, snoozeCount, triggerAlarm, stopAlarm, snoozeAlarm, alarmMessage }}>
            {children}
        </AlarmContext.Provider>
    );
};

export const useAlarm = () => {
    const context = useContext(AlarmContext);
    if (context === undefined) {
        throw new Error('useAlarm must be used within an AlarmProvider');
    }
    return context;
};
