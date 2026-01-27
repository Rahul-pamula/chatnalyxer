import { StyleSheet, Platform, Dimensions } from 'react-native';
import { colors, shadows } from '../src/theme/colors';

const { width } = Dimensions.get('window');

export const setupStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },

    // Header
    header: {
        marginBottom: 24,
        marginTop: 10,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        paddingRight: 16,
    },
    profileButton: {
        padding: 8,
        backgroundColor: colors.surface,
        borderRadius: 50,
        ...shadows.sm,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 20,
    },

    // Card Common
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginLeft: 10,
    },

    // WhatsApp Connected State
    connectedContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    operationalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)', // Green tint
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 100,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    badgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: 8,
    },
    statusText: {
        color: colors.success,
        fontWeight: '600',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    connectionDetails: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: 4,
    },
    connectionSubtext: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 24,
    },

    // Actions
    buttonPrimary: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
        ...shadows.primaryGlow,
    },
    buttonTextPrimary: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryActionsRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    buttonSecondary: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    buttonTextSecondary: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    buttonDestructive: {
        flex: 1,
        backgroundColor: '#fee2e2', // Light red
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonTextDestructive: {
        color: colors.error,
        fontSize: 15,
        fontWeight: '600',
    },

    // Calendar & Events Shortcut
    calendarCard: {
        backgroundColor: 'rgba(99, 102, 241, 0.05)', // Primary tint
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    calendarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    calendarIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.sm,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    calendarSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
    },

    // Disconnected / Setup State
    whatsappContent: {
        marginTop: 0,
    },
    whatsappDesc: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 24,
        lineHeight: 22,
    },
    methodTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    methodsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    methodButton: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        height: 110,
        justifyContent: 'center',
        ...shadows.sm,
    },
    methodButtonActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        borderWidth: 2,
    },
    methodButtonContent: {
        alignItems: 'center',
        gap: 12,
    },
    methodButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    methodButtonTextActive: {
        color: colors.primary,
    },
    methodButtonDisabled: {
        opacity: 0.5,
        backgroundColor: colors.surfaceHighlight,
    },

    // QR Code
    qrContainer: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
        ...shadows.sm,
    },
    expiryWarning: {
        marginTop: 16,
        fontSize: 14,
        color: colors.warning,
        fontWeight: '600',
    },
    generatingText: { // Re-added this
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary
    },
    waitText: { // Re-added this
        marginTop: 8,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center'
    },

    // Email Section
    emailSection: {
        opacity: 0.8,
    },
    emailDesc: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
        lineHeight: 22,
    },
    comingSoonBadgeInline: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 12,
        alignSelf: 'flex-start',
    },
    comingSoonTextInline: {
        color: '#D97706',
        fontSize: 11,
        fontWeight: '700',
    },

    // Badges
    comingSoonBadgeAbsolute: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: colors.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 10,
    },
    comingSoonTextSmall: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        minHeight: '50%',
        ...shadows.xl,
    },

    // Misc
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '500',
    },
});
