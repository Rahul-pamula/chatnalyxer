import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BASE_URL } from '../src/config';
import { colors, shadows } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';

const { width } = Dimensions.get('window');

type AnalyticsData = {
  total_messages: number;
  priority_distribution: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  urgency_score_avg: number;
  messages_with_deadlines: number;
  top_keywords: [string, number][];
};

type Group = {
  id: number;
  name: string;
  whatsapp_id: string;
  is_selected: boolean;
  created_at: string;
};

export default function Analytics() {
  const router = useRouter();
  const { token } = useAuth();
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch selected groups with authentication
      const groupsResponse = await fetch(`${BASE_URL}/groups/selected`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (groupsResponse.status === 401) {
        // Token expired, redirect to login
        Alert.alert('Session Expired', 'Please login again');
        router.push('/login');
        return;
      }

      if (!groupsResponse.ok) {
        throw new Error('Failed to fetch groups');
      }

      const groups = await groupsResponse.json();

      if (groups.length === 0) {
        // No groups selected, redirect to groups page
        setError('No groups selected');
        setTimeout(() => router.push('/groups'), 2000);
        return;
      }

      setSelectedGroups(groups);

      // Fetch analytics data with authentication
      const analyticsResponse = await fetch(`${BASE_URL}/messages/analytics/public`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!analyticsResponse.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analytics = await analyticsResponse.json();
      setAnalyticsData(analytics);

    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const renderPriorityChart = () => {
    if (!analyticsData) return null;

    const { HIGH, MEDIUM, LOW } = analyticsData.priority_distribution;
    const total = HIGH + MEDIUM + LOW;

    if (total === 0) return null;

    const highPercent = (HIGH / total) * 100;
    const mediumPercent = (MEDIUM / total) * 100;
    const lowPercent = (LOW / total) * 100;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Priority Distribution</Text>

        {/* Bar Chart */}
        <View style={styles.barChart}>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>HIGH</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, styles.highBar, { width: `${highPercent}%` }]} />
            </View>
            <Text style={styles.barValue}>{HIGH}</Text>
          </View>

          <View style={styles.barRow}>
            <Text style={styles.barLabel}>MEDIUM</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, styles.mediumBar, { width: `${mediumPercent}%` }]} />
            </View>
            <Text style={styles.barValue}>{MEDIUM}</Text>
          </View>

          <View style={styles.barRow}>
            <Text style={styles.barLabel}>LOW</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, styles.lowBar, { width: `${lowPercent}%` }]} />
            </View>
            <Text style={styles.barValue}>{LOW}</Text>
          </View>
        </View>

        {/* Percentages */}
        <View style={styles.percentageRow}>
          <Text style={styles.percentageText}>
            🔴 {highPercent.toFixed(1)}% High • 🟡 {mediumPercent.toFixed(1)}% Medium • 🟢 {lowPercent.toFixed(1)}% Low
          </Text>
        </View>
      </View>
    );
  };

  const renderKeywordsChart = () => {
    if (!analyticsData || !analyticsData.top_keywords.length) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Keywords</Text>
        <View style={styles.keywordsList}>
          {analyticsData.top_keywords.slice(0, 8).map(([keyword, count], index) => (
            <View key={keyword} style={styles.keywordItem}>
              <Text style={styles.keywordRank}>#{index + 1}</Text>
              <Text style={styles.keywordText}>{keyword}</Text>
              <Text style={styles.keywordCount}>{count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMetricCard = (title: string, value: string | number, subtitle?: string, icon?: string) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchAnalytics}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        {error === 'No groups selected' && (
          <TouchableOpacity
            style={styles.selectGroupsButton}
            onPress={() => router.push('/groups')}
          >
            <Text style={styles.selectGroupsButtonText}>Select Groups</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>No analytics data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 ML Analytics Dashboard</Text>
        <Text style={styles.subtitle}>
          Intelligence insights from {selectedGroups.length} monitored groups
        </Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        {renderMetricCard(
          'Total Messages',
          analyticsData.total_messages.toLocaleString(),
          'Analyzed by ML',
          '💬'
        )}
        {renderMetricCard(
          'Avg Urgency Score',
          (analyticsData.urgency_score_avg * 100).toFixed(1) + '%',
          'ML confidence',
          '⚡'
        )}
        {renderMetricCard(
          'Messages with Deadlines',
          analyticsData.messages_with_deadlines.toLocaleString(),
          'Auto-extracted',
          '📅'
        )}
        {renderMetricCard(
          'Priority Messages',
          (analyticsData.priority_distribution.HIGH +
            (analyticsData.priority_distribution.MEDIUM * 0.5)).toFixed(0),
          'Require attention',
          '🚨'
        )}
      </View>

      {/* Charts */}
      {renderPriorityChart()}
      {renderKeywordsChart()}

      {/* Selected Groups */}
      <View style={styles.groupsSection}>
        <Text style={styles.sectionTitle}>Monitored Groups</Text>
        {selectedGroups.map((group) => (
          <View key={group.id} style={styles.groupItem}>
            <View style={styles.groupAvatar}>
              <Text style={styles.groupAvatarText}>
                {group.name?.[0]?.toUpperCase() || 'G'}
              </Text>
            </View>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupStatus}>Active</Text>
          </View>
        ))}
      </View>

      {/* ML Information */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>🤖 About ML Analysis</Text>
        <Text style={styles.infoText}>
          Our machine learning system analyzes messages for priority detection using:
        </Text>
        <Text style={styles.infoItem}>• Keyword pattern recognition</Text>
        <Text style={styles.infoItem}>• Deadline extraction from natural language</Text>
        <Text style={styles.infoItem}>• Urgency scoring based on context</Text>
        <Text style={styles.infoItem}>• Educational domain-specific training</Text>
        <Text style={styles.infoFooter}>
          Priority messages are automatically highlighted to help you focus on what matters most.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  metricIcon: { fontSize: 24, marginBottom: 8 },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  metricTitle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  metricSubtitle: { fontSize: 10, color: colors.textTertiary, textAlign: 'center', marginTop: 2 },

  chartContainer: {
    backgroundColor: colors.surface,
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    ...shadows.sm,
  },
  chartTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },

  barChart: { marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 60, fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  barContainer: { flex: 1, height: 20, backgroundColor: colors.surfaceHighlight, borderRadius: 10, marginHorizontal: 8 },
  bar: { height: '100%', borderRadius: 10 },
  highBar: { backgroundColor: colors.error },
  mediumBar: { backgroundColor: colors.warning },
  lowBar: { backgroundColor: colors.success },
  barValue: { width: 30, fontSize: 12, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },

  percentageRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  percentageText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },

  keywordsList: { gap: 8 },
  keywordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 8,
  },
  keywordRank: { fontSize: 12, fontWeight: '600', color: colors.textTertiary, width: 24 },
  keywordText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginLeft: 8 },
  keywordCount: { fontSize: 12, fontWeight: '600', color: colors.primary },

  groupsSection: { margin: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    ...shadows.sm,
  },
  groupAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupAvatarText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  groupName: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  groupStatus: { fontSize: 12, color: colors.success, fontWeight: '500' },

  infoSection: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.info + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.info + '40',
  },
  infoTitle: { fontSize: 16, fontWeight: '600', color: colors.primaryDark, marginBottom: 8 },
  infoText: { fontSize: 14, color: colors.primaryDark, marginBottom: 8, lineHeight: 20 },
  infoItem: { fontSize: 13, color: colors.primary, marginBottom: 4, lineHeight: 18 },
  infoFooter: { fontSize: 13, color: colors.primary, marginTop: 8, fontStyle: 'italic', lineHeight: 18 },

  loadingText: { marginTop: 16, fontSize: 16, color: colors.textSecondary },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center', marginBottom: 24 },
  emptyText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectGroupsButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  selectGroupsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});