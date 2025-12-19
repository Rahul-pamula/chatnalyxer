import { StyleSheet, Platform } from 'react-native';
import { colors } from '../src/theme/colors';

export const setupStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa', // Softer background
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
        marginTop: Platform.OS === 'ios' ? 20 : 0,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: '85%',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2c3e50',
    },
    instructionText: {
        fontSize: 15,
        color: '#555',
        lineHeight: 22,
        marginBottom: 24,
    },
    // QR Code Specific
    qrContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 20,
    },
    codeDisplay: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    codeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c3e50',
        letterSpacing: 6,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    // Status Indicators
    statusBadge: {
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#c8e6c9',
        marginBottom: 24,
    },
    statusText: {
        color: '#2e7d32',
        fontWeight: '600',
        fontSize: 14,
    },
    // Buttons
    buttonPrimary: {
        backgroundColor: '#007AFF', // iOS Blue
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonSecondary: {
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonDestructive: {
        backgroundColor: '#ffebee',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonTextPrimary: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextSecondary: {
        color: '#555',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextDestructive: {
        color: '#d32f2f',
        fontSize: 16,
        fontWeight: '600',
    },
    // Email Section specific
    emailSection: {
        marginTop: 8,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        opacity: 0.9,
    },
    emailHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#34495e',
        marginBottom: 8,
    },
    comingSoonBadge: {
        backgroundColor: '#fff3e0',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 12,
    },
    comingSoonText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    methodButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
    },
    comingSoonBadgeSmall: {
        backgroundColor: colors.warning,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 4,
    },
    comingSoonTextSmall: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    methodButtonDisabled: {
        opacity: 0.5,
        backgroundColor: '#f5f5f5',
    },
    emailDesc: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 16,
        lineHeight: 20,
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    expiryWarning: {
        marginTop: 12,
        fontSize: 13,
        color: '#e74c3c',
        fontWeight: '600',
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 20,
    },

    // Pairing Code UI Styles
    whatsappContent: {
        marginTop: 12,
    },
    whatsappDesc: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20,
    },
    methodButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        backgroundColor: '#fff',
        gap: 8,
    },
    methodButtonActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '10',
    },
    methodButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    methodButtonTextActive: {
        color: colors.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
});
