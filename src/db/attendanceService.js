
const STORAGE_KEY = "picklestack_attendance";

export async function getAttendance() {
  return JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
  );
}

export async function saveAttendance(
  attendanceRecord
) {
  const attendance =
    await getAttendance();

  attendance.push(attendanceRecord);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(attendance)
  );
}

export async function clearAttendance() {
  localStorage.removeItem(
    STORAGE_KEY
  );
}

export async function deleteAttendanceBySession(
  sessionId
) {
  const attendance =
    await getAttendance();

  const filtered =
    attendance.filter(
      (record) =>
        record.sessionId !== sessionId
    );

  localStorage.setItem(
    "attendance",
    JSON.stringify(filtered)
  );
}