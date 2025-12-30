# Chatnalyxer Development Roadmap

## 🎯 PROTOTYPE (PRIORITY - For Submission)

### ✅ Already Working:
- [x] WhatsApp integration
- [x] AI message analysis (priority detection)
- [x] Deadline extraction from messages
- [x] Auto-create events from deadlines
- [x] Dashboard with messages
- [x] Deadline badges on messages

### 🔥 CRITICAL - Fix Before Demo:
- [ ] **Calendar Event Display** (30 mins)
  - Fix 401 auth error on `/events/scheduled`
  - Show auto-created events in calendar
  - Test: Events should appear on calendar
  
- [ ] **Deadline Navigation** (15 mins)
  - Clicking deadline badge → opens calendar on that date
  - Test: Click "Due in 1d" → calendar opens on deadline date

- [ ] **Push Notifications** (2-3 hours) ⚡ MOST IMPORTANT
  - Set up Expo push notifications
  - Send notification when event is auto-created
  - Send reminders: 1 day before, 1 hour before deadline
  - Test: Get notification on phone when deadline detected

### 📋 Demo Script:
1. Send WhatsApp message: "Submit report by tomorrow 5 PM"
2. Show: Message appears on dashboard with deadline badge
3. Show: Event auto-created in calendar
4. Show: Push notification received
5. Click: Deadline badge → navigates to calendar
6. ✅ Prototype complete!

---

## 📱 PHASE 1: Smart Timetable & Preferences (2-3 days)

### Backend:
- [ ] **Timetable Upload Endpoint**
  - `POST /timetable/upload` - accepts image/PDF
  - Gemini Vision API integration
  - Extract: classes, timings, rooms, faculty
  - Extract: student details (with confirmation)
  - Return: JSON with extracted data

- [ ] **Database Models**
  ```python
  class RecurringEvent(Base):
      # For weekly class schedule
      day_of_week, time_start, time_end
      subject, room, faculty
  
  class UserPreferences(Base):
      # Store user answers to smart questions
      class_reminders, break_notifications
      lab_handling, busy_day_strategy
  ```

- [ ] **Smart Questions Generator**
  - Analyze timetable data
  - Generate contextual questions
  - Parse natural language answers
  - Save preferences to user profile

### Mobile:
- [ ] **Profile → My Schedule Section**
  - Upload timetable button (camera + file picker)
  - Display extracted classes
  - Edit/delete individual classes
  - Review & confirm student details

- [ ] **Smart Questions UI**
  - Show questions one by one
  - Multiple choice + text input options
  - Natural language input: "Remind me 20 mins before first class"
  - Save preferences

- [ ] **Intelligent Notification Logic**
  - Don't remind for continuous classes
  - Respect class timings
  - Use break times for notifications
  - Reschedule if user is in class

### Testing:
- [ ] Upload sample timetable
- [ ] Verify AI extraction accuracy
- [ ] Answer smart questions
- [ ] Test notification timing
- [ ] Verify no notifications during class

---

## 📚 PHASE 2: Study Planner (1 week)

### Backend:
- [ ] **Subject Management**
  ```python
  class Subject(Base):
      name, code, faculty
      semester, credits
      syllabus_data (JSONB)
  
  class StudyTask(Base):
      subject_id, unit_number
      task_type: 'study', 'assignment', 'revision'
      scheduled_date, estimated_minutes
      status: 'pending', 'completed', 'missed'
  ```

- [ ] **Syllabus Upload & Analysis**
  - `POST /subject/{id}/upload-syllabus`
  - Gemini extracts: units, topics, weightage, exam pattern
  - Generate study plan based on exam dates
  - Distribute study hours across available time slots

- [ ] **Adaptive Rescheduling**
  - Track missed tasks
  - Find next available study slot
  - Avoid class times
  - Respect user's study preferences

### Mobile:
- [ ] **Analytics Page Redesign**
  - Subject grid with progress cards
  - Weekly study plan view
  - Overall progress stats

- [ ] **Subject Detail Page**
  - Syllabus with units
  - Study materials (PDFs)
  - Upcoming tasks
  - Exam countdown
  - Progress tracking

- [ ] **Task Management**
  - Mark tasks as complete
  - Reschedule missed tasks
  - Add custom study sessions

### Features:
- [ ] Upload syllabus PDF per subject
- [ ] AI generates study plan
- [ ] Track progress per unit
- [ ] Automatic rescheduling
- [ ] Study reminders

---

## 🎓 PHASE 3: Exam Preparation (1 week)

### Features:
- [ ] **Exam Management**
  - Add exam dates (mid-sem, final)
  - Syllabus coverage per exam
  - Countdown timers

- [ ] **Revision Planner**
  - Auto-schedule revision sessions
  - Spaced repetition algorithm
  - Focus on weak units

- [ ] **Practice Tracking**
  - Upload practice problems
  - Track solved vs pending
  - Mark difficulty level

- [ ] **Performance Analytics**
  - Study hours per subject
  - Completion rate
  - Predicted readiness score

### Mobile UI:
- [ ] Exam countdown widget
- [ ] Revision checklist
- [ ] Practice problem tracker
- [ ] Performance graphs

---

## 🤖 PHASE 4: Advanced AI Features (2 weeks)

### Chatbot with Memory:
- [ ] **Context-Aware Chatbot**
  - Remember user profile
  - Know user's timetable
  - Recall previous conversations
  - Personalized responses

- [ ] **User Context Learning**
  ```python
  class UserContext(Base):
      context_summary (Text)
      learned_preferences (JSONB)
      # Example: typical_study_time, responds_fastest_at
  ```

- [ ] **Behavior Tracking**
  ```python
  class UserInteraction(Base):
      interaction_type
      timestamp, context
  ```

- [ ] **Pattern Detection**
  - Most active time
  - Notification response rate
  - Preferred notification times
  - Auto-adjust settings

### Features:
- [ ] Chat with AI about schedule
- [ ] Ask about upcoming deadlines
- [ ] Get study recommendations
- [ ] Adaptive notification timing

---

## 🔔 PHASE 5: Advanced Notifications (1 week)

### Smart Notification System:
- [ ] **Quiet Hours**
  - User-defined quiet hours
  - Auto-detect from timetable
  - Reschedule notifications

- [ ] **Urgency Detection**
  - Immediate: < 30 mins
  - Urgent: < 1 hour
  - Important: < 1 day
  - Normal: > 1 day

- [ ] **Context-Aware Delivery**
  - Check if user is in class
  - Use break times
  - Bundle non-urgent messages
  - Prioritize faculty messages

- [ ] **Notification Channels**
  - Push notifications (urgent)
  - In-app badges (always)
  - Silent notifications (during class)

### Features:
- [ ] Customizable notification sounds
- [ ] Notification grouping
- [ ] Snooze functionality
- [ ] Smart bundling

---

## 🎨 PHASE 6: UI/UX Polish (1 week)

### Mobile App:
- [ ] Onboarding flow
- [ ] Dark mode
- [ ] Animations & transitions
- [ ] Loading states
- [ ] Error handling
- [ ] Offline support

### Features:
- [ ] Settings page
- [ ] Profile customization
- [ ] Theme selection
- [ ] Notification preferences
- [ ] Privacy settings

---

## 🚀 PHASE 7: Production Ready (1 week)

### Backend:
- [ ] Move secrets to environment variables
- [ ] Database migrations
- [ ] API rate limiting
- [ ] Error logging (Sentry)
- [ ] Performance monitoring

### Mobile:
- [ ] Build for production
- [ ] App icon & splash screen
- [ ] App store assets
- [ ] Privacy policy
- [ ] Terms of service

### Deployment:
- [ ] Backend: Azure/AWS
- [ ] Database: PostgreSQL (production)
- [ ] File storage: S3/Azure Blob
- [ ] Push notifications: Expo Push Service

---

## 📊 Future Enhancements (Post-Launch)

### Advanced Features:
- [ ] Attendance tracking
- [ ] Grade calculator
- [ ] Campus map integration
- [ ] Room navigation
- [ ] Study group finder
- [ ] Resource sharing
- [ ] Assignment submission tracking
- [ ] Faculty office hours
- [ ] Library book availability

### Analytics:
- [ ] Study patterns
- [ ] Productivity insights
- [ ] Time management tips
- [ ] Performance predictions

### Social Features:
- [ ] Share study plans
- [ ] Collaborative notes
- [ ] Study buddy matching
- [ ] Group study sessions

---

## 🎯 Current Focus:

**TODAY:** Fix calendar + Add push notifications (Prototype ready!)
**THIS WEEK:** Phase 1 (Timetable & Smart Questions)
**NEXT WEEK:** Phase 2 (Study Planner)
**WEEK 3:** Phase 3 (Exam Preparation)

---

## 📝 Notes:

- Keep prototype simple and working
- Get feedback after each phase
- Iterate based on user testing
- Don't over-engineer early
- Focus on core value: Smart notifications + Study planning

---

**Last Updated:** December 26, 2025
**Version:** 1.0
