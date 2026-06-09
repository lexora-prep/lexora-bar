-- Lexora launch RLS policies
-- Review first. Do not run blindly.
-- Assumes public tables already have RLS enabled.

-- Public read-only reference tables
drop policy if exists "subjects are readable by everyone" on public.subjects;
create policy "subjects are readable by everyone"
on public.subjects
for select
to public
using (true);

drop policy if exists "topics are readable by everyone" on public.topics;
create policy "topics are readable by everyone"
on public.topics
for select
to public
using (true);

drop policy if exists "subtopics are readable by everyone" on public.subtopics;
create policy "subtopics are readable by everyone"
on public.subtopics
for select
to public
using (true);

drop policy if exists "rules are readable by everyone" on public.rules;
create policy "rules are readable by everyone"
on public.rules
for select
to public
using (true);

-- Profiles: users can read/update their own profile only
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
to public
using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to public
using (auth.uid() = id)
with check (auth.uid() = id);

-- Study plan, Prisma uses text userId
drop policy if exists "users can read own study plan" on public."StudyPlan";
create policy "users can read own study plan"
on public."StudyPlan"
for select
to public
using (auth.uid()::text = "userId");

drop policy if exists "users can insert own study plan" on public."StudyPlan";
create policy "users can insert own study plan"
on public."StudyPlan"
for insert
to public
with check (auth.uid()::text = "userId");

drop policy if exists "users can update own study plan" on public."StudyPlan";
create policy "users can update own study plan"
on public."StudyPlan"
for update
to public
using (auth.uid()::text = "userId")
with check (auth.uid()::text = "userId");

drop policy if exists "users can delete own study plan" on public."StudyPlan";
create policy "users can delete own study plan"
on public."StudyPlan"
for delete
to public
using (auth.uid()::text = "userId");

-- Study sessions, Prisma uses text userId
drop policy if exists "users can read own study sessions" on public."StudySession";
create policy "users can read own study sessions"
on public."StudySession"
for select
to public
using (auth.uid()::text = "userId");

drop policy if exists "users can insert own study sessions" on public."StudySession";
create policy "users can insert own study sessions"
on public."StudySession"
for insert
to public
with check (auth.uid()::text = "userId");

drop policy if exists "users can update own study sessions" on public."StudySession";
create policy "users can update own study sessions"
on public."StudySession"
for update
to public
using (auth.uid()::text = "userId")
with check (auth.uid()::text = "userId");

-- Rule progress and attempts
drop policy if exists "users can read own rule attempts" on public.user_rule_attempts;
create policy "users can read own rule attempts"
on public.user_rule_attempts
for select
to public
using (auth.uid() = user_id);

drop policy if exists "users can insert own rule attempts" on public.user_rule_attempts;
create policy "users can insert own rule attempts"
on public.user_rule_attempts
for insert
to public
with check (auth.uid() = user_id);

drop policy if exists "users can read own mbe attempts" on public.user_mbe_attempts;
create policy "users can read own mbe attempts"
on public.user_mbe_attempts
for select
to public
using (auth.uid() = user_id);

drop policy if exists "users can insert own mbe attempts" on public.user_mbe_attempts;
create policy "users can insert own mbe attempts"
on public.user_mbe_attempts
for insert
to public
with check (auth.uid() = user_id);

-- Flashcards
drop policy if exists "users can read own flashcard sessions" on public.flashcard_sessions;
create policy "users can read own flashcard sessions"
on public.flashcard_sessions
for select
to public
using (auth.uid() = user_id);

drop policy if exists "users can insert own flashcard sessions" on public.flashcard_sessions;
create policy "users can insert own flashcard sessions"
on public.flashcard_sessions
for insert
to public
with check (auth.uid() = user_id);

drop policy if exists "users can update own flashcard sessions" on public.flashcard_sessions;
create policy "users can update own flashcard sessions"
on public.flashcard_sessions
for update
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can read own flashcard session cards" on public.flashcard_session_cards;
create policy "users can read own flashcard session cards"
on public.flashcard_session_cards
for select
to public
using (
  exists (
    select 1
    from public.flashcard_sessions s
    where s.id = flashcard_session_cards.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "users can insert own flashcard session cards" on public.flashcard_session_cards;
create policy "users can insert own flashcard session cards"
on public.flashcard_session_cards
for insert
to public
with check (
  exists (
    select 1
    from public.flashcard_sessions s
    where s.id = flashcard_session_cards.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "users can update own flashcard session cards" on public.flashcard_session_cards;
create policy "users can update own flashcard session cards"
on public.flashcard_session_cards
for update
to public
using (
  exists (
    select 1
    from public.flashcard_sessions s
    where s.id = flashcard_session_cards.session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.flashcard_sessions s
    where s.id = flashcard_session_cards.session_id
      and s.user_id = auth.uid()
  )
);

-- Support tickets
drop policy if exists "users can read own support tickets" on public.support_tickets;
create policy "users can read own support tickets"
on public.support_tickets
for select
to public
using (auth.uid() = user_id);

drop policy if exists "users can insert own support tickets" on public.support_tickets;
create policy "users can insert own support tickets"
on public.support_tickets
for insert
to public
with check (auth.uid() = user_id);

drop policy if exists "users can read own support ticket messages" on public.support_ticket_messages;
create policy "users can read own support ticket messages"
on public.support_ticket_messages
for select
to public
using (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "users can insert own support ticket messages" on public.support_ticket_messages;
create policy "users can insert own support ticket messages"
on public.support_ticket_messages
for insert
to public
with check (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and t.user_id = auth.uid()
  )
);

-- Billing records: user can read own payment records only
drop policy if exists "users can read own payment records" on public.paddle_payment_records;
create policy "users can read own payment records"
on public.paddle_payment_records
for select
to public
using (auth.uid() = user_id);

-- Notifications and activity logs
drop policy if exists "users can read own notifications" on public.user_notifications;
create policy "users can read own notifications"
on public.user_notifications
for select
to public
using (auth.uid() = user_id);

drop policy if exists "users can update own notifications" on public.user_notifications;
create policy "users can update own notifications"
on public.user_notifications
for update
to public
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can read own activity logs" on public.user_activity_logs;
create policy "users can read own activity logs"
on public.user_activity_logs
for select
to public
using (auth.uid() = user_id);

-- Account deletion requests
drop policy if exists "users can read own deletion requests" on public.account_deletion_requests;
create policy "users can read own deletion requests"
on public.account_deletion_requests
for select
to public
using (auth.uid() = user_id);

drop policy if exists "users can insert own deletion requests" on public.account_deletion_requests;
create policy "users can insert own deletion requests"
on public.account_deletion_requests
for insert
to public
with check (auth.uid() = user_id);
