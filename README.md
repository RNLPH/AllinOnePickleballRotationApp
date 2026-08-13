# 🏓 PickleStack

PickleStack is a pickleball session management and court rotation system designed for recreational and club play.

It was built to solve common open-play problems:

- Players waiting too long
- Unfair court assignments
- Repeated teammates
- Difficulty tracking attendance and match history
- Manual session management

---

# ✨ Features

## Open Court Rotation

Any available court can be used by any group of players.

There are no "winner courts" or "loser courts".

Players are assigned fairly based on queue priority rather than court designation.

---

## Fair Queue System

Player selection follows this order:

1. Priority Players
2. Unmatched Players First
3. Lowest Games Played
4. Longest Waiting Time

This helps ensure everyone gets equal opportunities to play.

---

## Smart Team Generation

When four players are selected:

- Partner history is checked
- New partnerships are preferred
- Repeated teammates are minimized

---

## Attendance Tracking

Automatically records attendance for each session.

Track:

- Session participation
- Attendance champions
- Historical attendance

---

## Match History

Stores:

- Teams
- Winners
- Court number
- Match duration
- Session

Provides a complete historical match record.

---

## Standings

Tracks:

- Games Played
- Wins
- Losses
- Current Win Streak
- Best Win Streak

---

## CSV Export

Export:

- Standings
- Attendance
- Match History

for external reporting and analysis.

---

# 🧠 Rotation Logic

## Open Court Rotation

The system assigns players to the first available empty court.

No court is designated as a "winner" or "loser" court.

---

## Queue Selection Algorithm

Implemented in:

```javascript
buildRotationGroup()
```

Priority order:

```text
Priority Flag
↓
Unmatched Players
↓
Lowest Games Played
↓
Longest Waiting Time
```

Example:

Player A

- 0 Games
- Waiting 15 Minutes

Player B

- 2 Games
- Waiting 20 Minutes

Player A will be selected first because games played have higher priority than waiting time.

---

## Unmatched Players First

Newly arrived players are assigned:

```javascript
queueGroup: "unmatched"
```

These players are always prioritized before players returning from completed matches.

Example:

Queue:

P1-P8 (already played)

P9-P12 (never played)

System selects:

```text
P9
P10
P11
P12
```

before reusing players who have already played.

---

## Partner Rotation System

Implemented in:

```javascript
createBalancedTeams()
```

Partner history is stored in:

```javascript
partnerHistory
```

The system evaluates all valid team combinations.

Example:

```text
P1
P2
P3
P4
```

Possible Teams:

A)

P1 + P2

P3 + P4

B)

P1 + P3

P2 + P4

C)

P1 + P4

P2 + P3

The combination with the fewest previous partnerships is selected.

---

# ⚙️ Core Functions

## Player Management

### addPlayer()

Adds a player to the current session.

Responsibilities:

- Validation
- Duplicate prevention
- Attendance registration
- Queue insertion

---

### removePlayer()

Removes a player from the waiting queue.

---

## Court Management

### addCourt()

Adds an additional court.

---

### removeCourt()

Removes the newest court.

Players are automatically returned to the queue.

---

### addPlayerToCourt()

Manually places a player on a court.

---

### removeCourtPlayer()

Removes a player from a court and returns them to the queue.

---

### moveCourtPlayer()

Moves a player between courts.

---

## Match Management

### assignPlayers()

Selects four players using the rotation algorithm and assigns them to an available court.

---

### startNextGame()

Starts the next available match.

Uses:

```javascript
assignPlayers()
```

---

### endGame()

Completes a match.

Updates:

- Games played
- Wins
- Losses
- Streaks
- Match history
- Partner history

Returns players to the queue.

---

## Rotation Functions

### buildRotationGroup()

Creates the next group of four players.

Selection order:

```text
Priority
↓
Unmatched
↓
Lowest Games
↓
Longest Waiting
```

---

### createBalancedTeams()

Determines the best team arrangement while avoiding repeated partners.

---

### recordPartners()

Records teammate history after every completed match.

---

### sortPlayers()

Sorts waiting players by:

```text
Priority
↓
Games Played
↓
Waiting Time
```

---

# 📊 Data Tracked Per Player

```javascript
{
  id,
  name,
  gamesPlayed,
  wins,
  losses,
  currentStreak,
  bestStreak,
  partnerHistory,
  priority,
  noPriority,
  queueGroup,
  waitingSince
}
```

---

# 🚀 Deployment

Hosted on:

```text
Vercel
```

Frontend:

```text
React
```

Build Tool:

```text
Vite
```

Storage:

```text
IndexedDB
```

---

# 🔮 Future Improvements

- Player wait-time display
- Rotation explanation panel
- Partner history viewer
- Player profile page
- Session analytics dashboard
- Data backup/import/export
- Tournament mode
- Mobile-first drag-and-drop improvements

---

# 📜 License

MIT License

Feel free to use, modify, and distribute.

---

Built with ❤️ for the pickleball community.