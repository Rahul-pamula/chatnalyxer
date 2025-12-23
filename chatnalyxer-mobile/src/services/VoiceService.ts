import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

export class VoiceService {
    private static recording: Audio.Recording | null = null;
    private static isListening = false;

    /**
     * Text-to-Speech: Read text aloud
     */
    static async speak(text: string, options?: {
        language?: string;
        pitch?: number;
        rate?: number;
    }): Promise<void> {
        try {
            const speechOptions: Speech.SpeechOptions = {
                language: options?.language || 'en-US',
                pitch: options?.pitch || 1.0,
                rate: options?.rate || 1.0,
            };

            await Speech.speak(text, speechOptions);
        } catch (error) {
            console.error('Text-to-speech error:', error);
            throw error;
        }
    }

    /**
     * Stop current speech
     */
    static async stopSpeaking(): Promise<void> {
        try {
            await Speech.stop();
        } catch (error) {
            console.error('Stop speaking error:', error);
        }
    }

    /**
     * Check if currently speaking
     */
    static async isSpeaking(): Promise<boolean> {
        try {
            return await Speech.isSpeakingAsync();
        } catch (error) {
            console.error('Is speaking check error:', error);
            return false;
        }
    }

    /**
     * Speech-to-Text: Start recording audio
     */
    static async startListening(): Promise<void> {
        try {
            // Clean up any existing recording first
            if (this.recording) {
                try {
                    await this.recording.stopAndUnloadAsync();
                } catch (e) {
                    console.log('Cleaned up previous recording');
                }
                this.recording = null;
            }

            // Request permissions
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) {
                throw new Error('Microphone permission not granted');
            }

            // Configure audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Start recording with WAV format for Azure Speech compatibility
            const recording = new Audio.Recording();
            await recording.prepareToRecordAsync({
                android: {
                    extension: '.wav',
                    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
                    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.wav',
                    audioQuality: Audio.IOSAudioQuality.HIGH,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {
                    mimeType: 'audio/wav',
                    bitsPerSecond: 128000,
                },
            });
            await recording.startAsync();

            this.recording = recording;
            this.isListening = true;

            console.log('🎤 Recording started (WAV format)');
        } catch (error) {
            console.error('Start listening error:', error);
            throw error;
        }
    }

    /**
     * Stop recording and return audio URI
     */
    static async stopListening(): Promise<string | null> {
        try {
            if (!this.recording) {
                return null;
            }

            await this.recording.stopAndUnloadAsync();
            const uri = this.recording.getURI();

            this.recording = null;
            this.isListening = false;

            console.log('🎤 Recording stopped:', uri);
            return uri;
        } catch (error) {
            console.error('Stop listening error:', error);
            return null;
        }
    }

    /**
     * Convert audio to text using Azure Speech API
     * Note: This requires backend endpoint implementation
     */
    static async transcribeAudio(audioUri: string, baseUrl: string, token: string): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('audio', {
                uri: audioUri,
                type: 'audio/wav',
                name: 'recording.wav',
            } as any);

            const response = await fetch(`${baseUrl}/speech/transcribe`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const data = await response.json();
            return data.text || '';
        } catch (error) {
            console.error('Transcription error:', error);
            throw error;
        }
    }

    /**
     * Check if microphone permission is granted
     */
    static async checkMicrophonePermission(): Promise<boolean> {
        try {
            const { granted } = await Audio.getPermissionsAsync();
            return granted;
        } catch (error) {
            console.error('Permission check error:', error);
            return false;
        }
    }

    /**
     * Request microphone permission
     */
    static async requestMicrophonePermission(): Promise<boolean> {
        try {
            const { granted } = await Audio.requestPermissionsAsync();
            return granted;
        } catch (error) {
            console.error('Permission request error:', error);
            return false;
        }
    }

    /**
     * Get available voices for text-to-speech
     */
    static async getAvailableVoices(): Promise<Speech.Voice[]> {
        try {
            return await Speech.getAvailableVoicesAsync();
        } catch (error) {
            console.error('Get voices error:', error);
            return [];
        }
    }
}
