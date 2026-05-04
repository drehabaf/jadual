"use client";

import React, { useEffect, useMemo, useState } from "react";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const DAYS = ["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"];
const DAY_INDEX_MAP = { Isnin: 1, Selasa: 2, Rabu: 3, Khamis: 4, Jumaat: 5, Sabtu: 6, Ahad: 0 };
const TIME_SLOTS = ["10:30 AM", "11:30 AM", "3:30 PM", "4:30 PM", "5:30 PM", "8:30 PM", "9:30 PM", "10:30 PM"];
const STORAGE_KEY = "drehab_appointments";

const getDateForDay = (targetDay, baseDate = new Date()) => {
  const targetIndex = DAY_INDEX_MAP[targetDay];
  if (typeof targetIndex !== "number") return "-";
  const today = new Date(baseDate);
  const diff = targetIndex - today.getDay();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toLocaleDateString("ms-MY", { day: "2-digit", month: "2-digit" });
};

const dayNameFromDate = (dateValue) => {
  if (!dateValue) return "";
  const map = { 1: "Isnin", 2: "Selasa", 3: "Rabu", 4: "Khamis", 5: "Jumaat", 6: "Sabtu", 0: "Ahad" };
  return map[new Date(`${dateValue}T00:00:00`).getDay()] || "";
};

const formatDateMY = (dateValue) => {
  if (!dateValue) return "-";
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getTotalAppointmentsForDay = (appointments, day) => appointments.filter((item) => item.day === day).length;

const groupAppointmentsByDayAndTime = (appointments) => {
  return DAYS.reduce((acc, day) => {
    acc[day] = TIME_SLOTS.map((time) => ({
      time,
      appointments: appointments.filter((item) => item.day === day && item.time === time),
    }));
    return acc;
  }, {});
};

function getWeekRange(baseDate = new Date()) {
  const current = new Date(baseDate);
  const diffToMonday = current.getDay() === 0 ? -6 : 1 - current.getDay();
  const monday = new Date(current);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(current.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function isAppointmentInCurrentWeek(appointment, baseDate = new Date()) {
  if (!appointment?.date) return false;
  const date = new Date(`${appointment.date}T00:00:00`);
  const { monday, sunday } = getWeekRange(baseDate);
  return date >= monday && date <= sunday;
}

function buildWhatsAppWeeklyMessage(appointments, baseDate = new Date()) {
  const currentWeekAppointments = appointments
    .filter((item) => isAppointmentInCurrentWeek(item, baseDate))
    .sort((a, b) => {
      const dateDiff = new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`);
      if (dateDiff !== 0) return dateDiff;
      return TIME_SLOTS.indexOf(a.time) - TIME_SLOTS.indexOf(b.time);
    });
  if (currentWeekAppointments.length === 0) return "";
  const groupedByDay = DAYS.map((day) => {
    const items = currentWeekAppointments.filter((item) => item.day === day);
    if (items.length === 0) return null;
    const firstDate = items[0]?.date ? formatDateMY(items[0].date) : "-";
    const lines = items.map((item, index) => `${index + 1}. ${item.time} - ${item.name} (${item.therapist || "-"})`);
    return [`${day} (${firstDate})`, ...lines].join("\n");
  }).filter(Boolean);
  return ["PUSAT KESIHATAN DREHAB AF", "SENARAI TEMUJANJI MINGGU SEMASA", "", ...groupedByDay].join("\n\n");
}

function runUtilityTests() {
  const sample = [
    { id: 1, name: "A", therapist: "HANIS", date: "2026-05-04", day: "Isnin", time: "10:30 AM" },
    { id: 2, name: "B", therapist: "ALI", date: "2026-05-04", day: "Isnin", time: "11:30 AM" },
    { id: 3, name: "C", therapist: "MUMTAZAH", date: "2026-05-05", day: "Selasa", time: "10:30 AM" },
  ];
  const grouped = groupAppointmentsByDayAndTime(sample);
  const weeklyMessage = buildWhatsAppWeeklyMessage([
    { id: 6, name: "Dalam Minggu", therapist: "HANIS", date: "2026-05-06", day: "Rabu", time: "3:30 PM" },
    { id: 7, name: "Luar Minggu", therapist: "HANIS", date: "2026-05-13", day: "Rabu", time: "3:30 PM" },
  ], new Date("2026-05-06T12:00:00"));
  const tests = {
    testMonday: dayNameFromDate("2026-05-04") === "Isnin",
    testSunday: dayNameFromDate("2026-05-10") === "Ahad",
    testSaturday: dayNameFromDate("2026-05-09") === "Sabtu",
    testInvalidDate: dayNameFromDate("") === "",
    testTimeSlots: TIME_SLOTS.every((slot) => /AM|PM/.test(slot)),
    testDateLookup: getDateForDay("Isnin", new Date("2026-05-04T00:00:00")) === "04/05",
    testInvalidDay: getDateForDay("Raya", new Date("2026-05-04T00:00:00")) === "-",
    testSevenDays: DAYS.length === 7,
    testDayTotals: getTotalAppointmentsForDay(sample, "Isnin") === 2,
    testGroupedSlot: grouped.Isnin[0].appointments.length === 1,
    testEmptyGroupedDays: Object.keys(groupAppointmentsByDayAndTime([])).length === 7,
    testCurrentWeekFilter: isAppointmentInCurrentWeek({ id: 4, date: "2026-05-06", day: "Rabu", time: "3:30 PM" }, new Date("2026-05-06T12:00:00")),
    testOutsideCurrentWeekFilter: !isAppointmentInCurrentWeek({ id: 5, date: "2026-05-13", day: "Rabu", time: "3:30 PM" }, new Date("2026-05-06T12:00:00")),
    testWhatsAppMessageCurrentWeekOnly: weeklyMessage.includes("Dalam Minggu") && !weeklyMessage.includes("Luar Minggu"),
    testWhatsAppMessageNewlines: weeklyMessage.includes("\n\n") && weeklyMessage.includes("Rabu"),
  };
  if (Object.values(tests).some((value) => !value)) console.warn("Utility test failed", tests);
}
runUtilityTests();

function AppIcon({ onOpen }) {
  return (
    <button onClick={onOpen} className="group flex w-full flex-col items-center gap-3 rounded-[2rem] border border-white/10 bg-white/5 p-5 text-center shadow-2xl shadow-purple-950/40 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10 active:scale-95">
      <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-cyan-300 via-blue-600 to-purple-700 shadow-xl shadow-cyan-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.85),transparent_26%),radial-gradient(circle_at_75%_80%,rgba(236,72,153,0.8),transparent_30%)]" />
        <div className="relative text-5xl">📅</div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-base font-bold text-white">Jadual Rawatan</p>
        <div className="animate-pulse rounded-xl border border-green-300/50 bg-green-500/30 px-4 py-1 text-xs font-black tracking-wider text-green-100 shadow-lg shadow-green-500/40 backdrop-blur-md transition group-hover:scale-105">BUKA</div>
      </div>
    </button>
  );
}

function PhoneShell({ children }) {
  return (
    <div className="min-h-screen bg-[#07071a] px-4 py-6 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute -right-24 top-40 h-96 w-96 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto min-h-[760px] w-full max-w-[390px] overflow-hidden rounded-[3rem] border border-white/15 bg-black/40 shadow-2xl shadow-purple-950/60 backdrop-blur-2xl">
        <div className="absolute left-1/2 top-3 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black/80" />
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="relative z-10 px-5 pb-6 pt-14">{children}</div>
      </div>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return (
    <div className="flex shrink-0 flex-col items-end rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-300/15 to-blue-500/15 px-3 py-2 shadow-lg shadow-cyan-500/20 backdrop-blur-xl">
      <div className="flex items-end gap-1">
        <span className="text-sm font-black tracking-wider text-cyan-100 tabular-nums">{time}</span>
        <span className="animate-pulse text-[10px] font-bold text-cyan-200/70 tabular-nums">{seconds}</span>
      </div>
      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-200/60">Live</span>
    </div>
  );
}

function AppointmentListDrawer({ open, onClose, appointments }) {
  return (
    <div className={cx("absolute inset-0 z-30 transition", open ? "pointer-events-auto" : "pointer-events-none")}>
      <button onClick={onClose} className={cx("absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} aria-label="Tutup senarai temujanji" />
      <div className={cx("absolute left-0 top-0 h-full w-[86%] max-w-[330px] border-r border-cyan-300/20 bg-[#080b20]/95 px-4 py-10 shadow-2xl shadow-cyan-950/60 backdrop-blur-2xl transition-transform duration-300", open ? "translate-x-0" : "-translate-x-full")}> 
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200/70">Senarai</p>
            <h2 className="text-xl font-black text-white">Temujanji Terkini</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg text-white active:scale-95">×</button>
        </div>
        <div className="max-h-[650px] space-y-1 overflow-y-auto pr-1">
          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">Belum ada temujanji disimpan.</div>
          ) : (
            appointments.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-green-300/15 bg-green-500/8 px-2 py-1 text-[9px] shadow-sm shadow-green-500/5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black leading-tight text-white">{item.name} ({item.therapist || "-"})</p>
                  <p className="truncate text-[8px] font-semibold leading-tight text-green-100/70">{item.day} • {formatDateMY(item.date)}</p>
                </div>
                <div className="ml-2 shrink-0 rounded-md border border-cyan-300/15 bg-cyan-300/10 px-1.5 py-0.5 text-[8px] font-black text-cyan-100">{item.time}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ onOpen, appointments }) {
  const [showList, setShowList] = useState(false);
  return (
    <PhoneShell>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">PUSAT KESIHATAN DREHAB AF</p></div>
        <Clock />
      </div>
      <div className="grid grid-cols-2 gap-4"><AppIcon onOpen={onOpen} /></div>
      <button onClick={() => setShowList(true)} className="mt-8 flex w-full items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-left shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300/15 active:scale-[0.98]">
        <div><p className="text-sm font-black text-cyan-100">Senarai Temujanji Terkini</p><p className="mt-0.5 text-[11px] text-cyan-50/55">Tekan untuk buka senarai</p></div>
        <div className="rounded-xl border border-green-300/30 bg-green-500/20 px-3 py-1 text-xs font-black text-green-100 shadow-md shadow-green-500/20">{appointments.length}</div>
      </button>
      <AppointmentListDrawer open={showList} onClose={() => setShowList(false)} appointments={appointments} />
      <div className="mt-6 flex items-center justify-around rounded-[2rem] border border-white/10 bg-white/10 px-4 py-3 shadow-2xl shadow-purple-950/40 backdrop-blur-xl">
        <div onClick={() => window.open("https://daftar.drehabaf.com", "_blank")} className="flex cursor-pointer flex-col items-center gap-1"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 text-xl shadow-lg shadow-cyan-500/30">📝</div><span className="text-[10px] font-bold text-cyan-100">Daftar</span></div>
        <div onClick={() => window.open("https://rekod.drehabaf.com", "_blank")} className="flex cursor-pointer flex-col items-center gap-1"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-pink-600 text-xl shadow-lg shadow-purple-500/30">📂</div><span className="text-[10px] font-bold text-cyan-100">Rekod</span></div>
        <div onClick={() => window.open("https://app.drehabaf.com", "_blank")} className="flex cursor-pointer flex-col items-center gap-1 transition active:scale-95">
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 shadow-2xl shadow-blue-500/40 ring-1 ring-white/10"><div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.6),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.6),transparent_40%)] opacity-70" /><span className="relative text-sm font-extrabold tracking-wide text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.9)]">AF</span></div>
          <span className="text-[10px] font-bold text-cyan-100">Drehab AF</span>
        </div>
      </div>
    </PhoneShell>
  );
}

function AppointmentForm({ appointments, setAppointments }) {
  const [form, setForm] = useState({ name: "", therapist: "", date: "", time: "" });
  const [error, setError] = useState("");
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.therapist.trim() || !form.date || !form.time) {
      setError("Sila isi Nama, Tarikh dan Masa sebelum simpan.");
      return;
    }
    const conflict = appointments.find((a) => a.date === form.date && a.time === form.time && (a.therapist || "").toLowerCase() === form.therapist.trim().toLowerCase());
    if (conflict) {
      setError("Slot Penuh! Pilih masa yang sesuai.");
      return;
    }
    setAppointments([{ id: Date.now(), name: form.name.trim(), therapist: form.therapist.trim(), date: form.date, day: dayNameFromDate(form.date), time: form.time }, ...appointments]);
    setForm({ name: "", therapist: "", date: "", time: "" });
    setError("");
  };
  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Nama Pesakit *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} placeholder="Contoh: AHMAD NAZRI" className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/20" /></div>
        <div><label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Juruterapi *</label><input value={form.therapist} onChange={(e) => setForm({ ...form, therapist: e.target.value.toUpperCase() })} placeholder="Contoh: HANIS" className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/20" /></div>
        <div><label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Tarikh *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/20" />{form.date && <p className="mt-2 text-xs text-purple-100/80">Hari: <span className="font-bold text-cyan-100">{dayNameFromDate(form.date)}</span></p>}</div>
        <div><label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">MASA *</label><select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/20"><option className="bg-slate-950" value="">Pilih masa rawatan</option>{TIME_SLOTS.map((time) => <option className="bg-slate-950" key={time} value={time}>{time}</option>)}</select></div>
        {error && <div className="rounded-2xl border border-pink-400/30 bg-pink-500/15 px-4 py-3 text-sm font-semibold text-pink-100">{error}</div>}
        <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-600 px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-blue-600/30 transition active:scale-95">REKOD</button>
      </form>
    </div>
  );
}

function WeeklySchedule({ appointments }) {
  const grouped = useMemo(() => groupAppointmentsByDayAndTime(appointments), [appointments]);
  const sendToWhatsApp = () => {
    const message = buildWhatsAppWeeklyMessage(appointments);
    if (!message) {
      alert("Tiada rekod minggu semasa untuk dihantar.");
      return;
    }
    window.open(`https://wa.me/60189562511?text=${encodeURIComponent(message)}`, "_blank");
  };
  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-center shadow-lg shadow-cyan-950/20">
        <button onClick={sendToWhatsApp} className="mb-2 w-full rounded-xl bg-[#007AFF] px-3 py-2 text-[11px] font-semibold tracking-wide text-white shadow-lg shadow-blue-500/30 active:scale-95">WHATSAPP</button>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/80">PAPARAN JADUAL 7 HARI</p>
        <p className="mt-0.5 text-[10px] text-white/45">Isnin hingga Ahad • Slot rawatan harian</p>
      </div>
      <div className="grid grid-cols-7 gap-1">{DAYS.map((day) => <div key={day} className="rounded-xl border border-cyan-300/20 bg-gradient-to-br from-white/10 to-cyan-300/10 px-1 py-2 text-center shadow-sm shadow-cyan-950/20"><p className="text-[9px] font-black leading-none text-white">{day.slice(0, 3)}</p><p className="mt-0.5 text-[8px] text-cyan-100/70">{getDateForDay(day)}</p><p className="mt-0.5 text-[8px] font-bold text-cyan-100/80">{getTotalAppointmentsForDay(appointments, day)}</p></div>)}</div>
      <div className="grid grid-cols-1 gap-2">
        {DAYS.map((day) => <div key={day} className="rounded-[1.4rem] border border-white/10 bg-white/8 px-2.5 py-2.5 shadow-md shadow-purple-950/20"><div className="mb-1.5 flex items-center justify-between"><h3 className="text-[13px] font-black text-white">{day} <span className="text-[10px] text-cyan-100/60">({getDateForDay(day)})</span></h3><span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[9px] font-bold text-cyan-100">{getTotalAppointmentsForDay(appointments, day)} temujanji</span></div><div className="grid grid-cols-4 gap-1.5">{grouped[day].map((slot) => { const filled = slot.appointments.length > 0; return <div key={`${day}-${slot.time}`} className={cx("min-h-[42px] rounded-xl border px-1.5 py-1.5 text-center", filled ? "border-green-300/30 bg-green-500/25 shadow-lg shadow-green-500/20" : "border-white/8 bg-black/15")}><p className={cx("text-[8px] font-black leading-none", filled ? "text-green-100" : "text-cyan-100/55")}>{slot.time}</p>{filled ? <p className="mt-1 truncate text-[8px] font-bold leading-tight text-white">{slot.appointments.map((item) => `${item.name} (${item.therapist || "-"})`).join(", ")}</p> : <p className="mt-1 text-[8px] leading-tight text-white/25">Kosong</p>}</div>; })}</div></div>)}
      </div>
    </div>
  );
}

function JadualRawatanApp({ onBack, appointments, setAppointments }) {
  const [activeTab, setActiveTab] = useState("FORM");
  return (
    <PhoneShell>
      <div className="mb-5 flex items-center justify-between gap-3"><button onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg shadow-lg active:scale-95">‹</button><div className="min-w-0 flex-1 text-center"><p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">PUSAT KESIHATAN DREHAB AF</p></div><Clock /></div>
      <div className="mb-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/8 p-1"><button onClick={() => setActiveTab("FORM")} className={cx("rounded-xl px-3 py-3 text-xs font-black transition", activeTab === "FORM" ? "bg-gradient-to-r from-cyan-300 to-blue-600 text-white shadow-lg shadow-blue-600/30" : "text-white/55")}>Temujanji Pesakit</button><button onClick={() => setActiveTab("WEEK")} className={cx("rounded-xl px-3 py-3 text-xs font-black transition", activeTab === "WEEK" ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-white/55")}>Jadual</button></div>
      <div className="max-h-[620px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">{activeTab === "FORM" ? <AppointmentForm appointments={appointments} setAppointments={setAppointments} /> : <WeeklySchedule appointments={appointments} />}</div>
    </PhoneShell>
  );
}

export default function App() {
  const [screen, setScreen] = useState("HOME");
  const [appointments, setAppointments] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.warn("Failed to parse localStorage", error);
    }
    return [{ id: 1, name: "CONTOH PESAKIT", therapist: "HANIS", date: "2026-05-04", day: "Isnin", time: "10:30 AM" }];
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    } catch (error) {
      console.warn("Failed to save localStorage", error);
    }
  }, [appointments]);
  if (screen === "APP") return <JadualRawatanApp onBack={() => setScreen("HOME")} appointments={appointments} setAppointments={setAppointments} />;
  return <HomeScreen onOpen={() => setScreen("APP")} appointments={appointments} />;
}
