# 🤖 ML-Based Message Priority Detection System

## Overview

This document explains the Machine Learning system implemented in Chatnalyxer for automatically detecting priority messages in WhatsApp educational groups. The system analyzes message content to identify urgent communications such as assignment deadlines, submission requirements, and time-sensitive notifications.

## 🎯 Purpose

The ML system solves the problem of information overload in educational WhatsApp groups by:

- **Filtering Priority Messages**: Only showing messages that require immediate attention
- **Deadline Detection**: Automatically extracting deadlines from natural language
- **Urgency Scoring**: Assigning confidence scores to message importance
- **Educational Context**: Optimized for academic and educational communications

## 🧠 How It Works

### 1. **Message Analysis Pipeline**

When a new WhatsApp message arrives, it goes through this analysis pipeline:

```
WhatsApp Message → ML Analyzer → Priority Classification → Database Storage → Dashboard Display
```

### 2. **ML Components**

#### **Keyword Pattern Recognition**
- **High Priority Keywords**: `urgent`, `asap`, `deadline`, `submission`, `due today`, `emergency`
- **Medium Priority Keywords**: `assignment`, `exam`, `test`, `project`, `meeting`, `reminder`
- **Context Analysis**: Considers surrounding words and phrases

#### **Deadline Extraction**
Uses regex patterns and natural language processing to detect:
- Absolute dates: "Due on 15/12/2024", "Submit by January 20th"
- Relative dates: "Due tomorrow", "Submit today", "Deadline tonight"
- Time expressions: "By 11:59 PM", "Before 6:00 AM"

#### **Urgency Scoring Algorithm**
Calculates a score from 0.0 to 1.0 based on:
- Keyword frequency and importance weights
- Temporal urgency (today/tomorrow = higher score)
- Text formatting (ALL CAPS, exclamation marks)
- Educational domain context

### 3. **Priority Classification**

Messages are classified into three levels:

| Priority Level | Criteria | Examples |
|---------------|----------|----------|
| **HIGH** | Urgency score ≥ 0.7 OR explicit urgent keywords | "URGENT: Assignment due today at 11:59 PM!" |
| **MEDIUM** | Urgency score 0.4-0.7 OR academic keywords | "Reminder: Project presentation next week" |
| **LOW** | Urgency score < 0.4 | "Happy birthday wishes" |

## 📊 Database Schema

The ML system adds these fields to the `messages` table:

```sql
-- ML-based priority detection fields
priority_level VARCHAR(10) DEFAULT 'MEDIUM' NOT NULL  -- HIGH, MEDIUM, LOW
urgency_score FLOAT DEFAULT 0.5 NOT NULL              -- 0.0 to 1.0
deadline_extracted DATETIME NULL                       -- Extracted deadline if any
extracted_keywords TEXT NULL                           -- JSON string of extracted keywords
is_priority INTEGER DEFAULT 0 NOT NULL                -- 0=normal, 1=priority
```

## 🔍 Example Analysis

### Input Message:
```
"URGENT: Math assignment submission deadline is today at 11:59 PM. Please submit your work on the portal ASAP!"
```

### ML Analysis Result:
```json
{
  "priority_level": "HIGH",
  "urgency_score": 0.95,
  "deadline_extracted": "2024-01-15T23:59:00Z",
  "extracted_keywords": ["urgent", "assignment", "submission", "deadline", "today", "asap"],
  "is_priority": 1
}
```

### Why HIGH Priority:
- ✅ Contains "URGENT" and "ASAP" (high priority keywords)
- ✅ Contains "today" (immediate temporal urgency)
- ✅ Contains "deadline" and "submission" (academic keywords)
- ✅ Uses ALL CAPS formatting
- ✅ Urgency score 0.95 > 0.7 threshold

## 🛠 Implementation Details

### File Structure
```
chatnalyxer-backend/
├── app/
│   ├── services/
│   │   ├── __init__.py
│   │   └── ml_analyzer.py          # Main ML analysis logic
│   ├── models.py                   # Database models with ML fields
│   └── routers/
│       └── messages.py             # API endpoints with ML integration
```

### Key Classes and Methods

#### `MLMessageAnalyzer` Class
```python
class MLMessageAnalyzer:
    def analyze_message(content: str, created_at: datetime) -> Dict
    def _extract_keywords(content: str) -> List[str]
    def _calculate_urgency_score(content: str, keywords: List[str]) -> float
    def _determine_priority_level(urgency_score: float, keywords: List[str]) -> str
    def _extract_deadline(content: str, created_at: datetime) -> Optional[datetime]
    def get_analytics_data(messages: List[Dict]) -> Dict
```

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /messages/from-whatsapp` | Receives WhatsApp messages and applies ML analysis |
| `GET /messages/priority/public` | Returns only priority messages |
| `GET /messages/analytics/public` | Returns ML analytics data for dashboard |

## 📈 Analytics and Visualization

The system provides comprehensive analytics:

### **Priority Distribution Chart**
- Visual breakdown of HIGH/MEDIUM/LOW priority messages
- Percentage calculations and color-coded bars

### **Top Keywords Analysis**
- Most frequently detected priority keywords
- Ranked list with occurrence counts

### **Key Metrics**
- Total messages analyzed
- Average urgency score
- Messages with extracted deadlines
- Priority message count

## 🎛 Configuration

### Keyword Customization
You can modify the keyword lists in `ml_analyzer.py`:

```python
# Add new high priority keywords
self.high_priority_keywords.append('critical')

# Add domain-specific keywords
self.medium_priority_keywords.extend(['lab', 'practicum', 'thesis'])
```

### Threshold Adjustment
Modify priority thresholds:

```python
# Make the system more sensitive (more messages marked as priority)
if urgency_score >= 0.5:  # Was 0.7
    return 'HIGH'
```

## 🚀 Future Enhancements

### Planned Improvements
1. **BERT-based Classification**: Implement transformer models for better context understanding
2. **Personalized Learning**: Adapt to individual group communication patterns
3. **Multi-language Support**: Extend beyond English to other languages
4. **Time-based Learning**: Learn from user feedback on priority accuracy
5. **Integration with Calendar**: Cross-reference with academic calendars

### Advanced Features
- **Sentiment Analysis**: Detect stress/urgency in tone
- **Topic Modeling**: Automatically categorize message topics
- **Duplicate Detection**: Identify repeated announcements
- **Social Graph Analysis**: Consider sender authority/role

## 🔧 Troubleshooting

### Common Issues

**Problem**: No priority messages detected
**Solution**: Check if keywords list includes domain-specific terms for your educational context

**Problem**: Too many false positives
**Solution**: Increase urgency score thresholds or refine keyword weights

**Problem**: Dates not extracted correctly
**Solution**: Add custom date patterns for your locale/format in `date_patterns`

### Debugging

Enable detailed logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check ML analysis results in the console:
```
🚨 PRIORITY MESSAGE detected: URGENT: Assignment due... (Priority: HIGH, Score: 0.85)
```

## 📚 Dependencies

- `python-dateutil`: For flexible date parsing
- `re`: Regular expressions for pattern matching
- `json`: For keyword serialization
- `datetime`: Temporal analysis
- `logging`: System logging

## 🤝 Contributing

To improve the ML system:

1. **Add Keywords**: Extend keyword lists for your educational domain
2. **Pattern Enhancement**: Add new regex patterns for date/time extraction
3. **Algorithm Tuning**: Adjust scoring weights based on your data
4. **Testing**: Create test cases with real educational messages

## 📞 Support

For questions about the ML system:
- Check console logs for priority message detection
- Review analytics dashboard for system performance
- Adjust thresholds based on your group's communication patterns

---

*This ML system is designed to evolve and improve with usage. The more educational messages it processes, the better it becomes at identifying truly important communications.*