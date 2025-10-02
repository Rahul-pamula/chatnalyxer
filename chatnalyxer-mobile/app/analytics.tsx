import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { BASE_URL } from '../src/config';

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

      // Fetch selected groups
      const groupsResponse = await fetch(`${BASE_URL}/groups/selected`);
      if (!groupsResponse.ok) {
        throw new Error('Failed to fetch groups');
      }
      const groups = await groupsResponse.json();
      setSelectedGroups(groups);

      // Fetch analytics data
      const analyticsResponse = await fetch(`${BASE_URL}/messages/analytics/public`);
      if (!analyticsResponse.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const analytics = await analyticsResponse.json();
      setAnalyticsData(analytics);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
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
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
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
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748B' },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  metricIcon: { fontSize: 24, marginBottom: 8 },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  metricTitle: { fontSize: 12, fontWeight: '600', color: '#64748B', textAlign: 'center' },
  metricSubtitle: { fontSize: 10, color: '#94A3B8', textAlign: 'center', marginTop: 2 },

  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 16 },

  barChart: { marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 60, fontSize: 12, fontWeight: '500', color: '#64748B' },
  barContainer: { flex: 1, height: 20, backgroundColor: '#F1F5F9', borderRadius: 10, marginHorizontal: 8 },
  bar: { height: '100%', borderRadius: 10 },
  highBar: { backgroundColor: '#EF4444' },
  mediumBar: { backgroundColor: '#F59E0B' },
  lowBar: { backgroundColor: '#10B981' },
  barValue: { width: 30, fontSize: 12, fontWeight: '600', color: '#0F172A', textAlign: 'right' },

  percentageRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12 },
  percentageText: { fontSize: 12, color: '#64748B', textAlign: 'center' },

  keywordsList: { gap: 8 },
  keywordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  keywordRank: { fontSize: 12, fontWeight: '600', color: '#94A3B8', width: 24 },
  keywordText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0F172A', marginLeft: 8 },
  keywordCount: { fontSize: 12, fontWeight: '600', color: '#2563EB' },

  groupsSection: { margin: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  groupAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupAvatarText: { color: '#1D4ED8', fontWeight: '600', fontSize: 14 },
  groupName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0F172A' },
  groupStatus: { fontSize: 12, color: '#10B981', fontWeight: '500' },

  infoSection: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: { fontSize: 16, fontWeight: '600', color: '#1E40AF', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#1E40AF', marginBottom: 8, lineHeight: 20 },
  infoItem: { fontSize: 13, color: '#3730A3', marginBottom: 4, lineHeight: 18 },
  infoFooter: { fontSize: 13, color: '#3730A3', marginTop: 8, fontStyle: 'italic', lineHeight: 18 },

  loadingText: { marginTop: 16, fontSize: 16, color: '#64748B' },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#64748B', textAlign: 'center' },
});