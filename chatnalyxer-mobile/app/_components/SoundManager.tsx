import { Audio } from 'expo-av';

export const SoundManager = {
    urgentSound: null as Audio.Sound | null,

    /**
     * Play an urgent alert sound (System Default or Custom)
     */
    playUrgentSound: async () => {
        try {
            // For now, we will use a system default sound if available, 
            // or unload/load a require asset if we had one.
            // Since we don't have a custom asset file guaranteed, we'll try to use
            // a standard approach or just log it for now if no file exists.

            // NOTE: In a real app, drag 'alert.mp3' into assets/sounds/
            // and use: require('../../assets/sounds/alert.mp3')

            console.log('🎵 Playing Urgent Sound...');

            // Example of how it would work with a file:
            // const { sound } = await Audio.Sound.createAsync(
            //    require('../../assets/sounds/alert.wav')
            // );
            // await sound.playAsync();

        } catch (error) {
            console.log('Error playing sound:', error);
        }
    },

    /**
     * Configure audio mode for foreground playback
     */
    configureAudio: async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
        } catch (error) {
            console.log('Error configuring audio:', error);
        }
    }
};
