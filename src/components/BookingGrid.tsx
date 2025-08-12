"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Room = { id: string; name: string };
type Booking = {
  id: string;
  roomId: string;
  start: string; // ISO yyyy-mm-dd
  end: string; // inclusive
  guestName: string;
  notes?: string;
};

const ROOMS: Room[] = [
  { id: "r1", name: "Cabin 1" },
  { id: "r2", name: "Cabin 2" },
  { id: "r3", name: "Cabin 3" },
  { id: "r4", name: "Powered Site A" },
  { id: "r5", name: "Powered Site B" },
];

const DAYS_TO_SHOW = 28;
const STORAGE_KEY = "shellybeach.bookings.v1";

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function eachDay(startISO: string, count: number) {
  return Array.from({ length: count }, (_, i) => addDaysISO(startISO, i));
}
function rangeOverlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  return !(aEnd < bStart || bEnd < aStart);
}

export default function BookingGrid() {
  const [anchorDate] = useState(startOfTodayISO());
  const days = useMemo(() => eachDay(anchorDate, DAYS_TO_SHOW), [anchorDate]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dragging, setDragging] = useState<{
    roomId: string;
    startIdx: number;
    endIdx: number;
  } | null>(null);
  const [modal, setModal] = useState<{
    roomId: string;
    start: string;
    end: string;
  } | null>(null);

  // Load/save
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBookings(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch {}
  }, [bookings]);

  function beginDrag(roomId: string, dayIdx: number) {
    setDragging({ roomId, startIdx: dayIdx, endIdx: dayIdx });
  }
  function updateDrag(dayIdx: number) {
    setDragging((prev) => (prev ? { ...prev, endIdx: dayIdx } : prev));
  }
  function endDrag() {
    if (!dragging) return;
    const [lo, hi] = [
      Math.min(dragging.startIdx, dragging.endIdx),
      Math.max(dragging.startIdx, dragging.endIdx),
    ];
    const start = days[lo];
    const end = days[hi];
    setDragging(null);
    setModal({ roomId: dragging.roomId, start, end });
  }

  function createBooking(guestName: string, notes?: string) {
    if (!modal) return;
    const id = crypto.randomUUID();
    const booking: Booking = {
      id,
      roomId: modal.roomId,
      start: modal.start,
      end: modal.end,
      guestName,
      notes,
    };
    setBookings((prev) => [...prev, booking]);
    setModal(null);
  }

  function deleteBooking(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }

  function roomBookings(roomId: string) {
    return bookings.filter((b) => b.roomId === roomId);
  }

  function isSelected(roomId: string, dayIdx: number) {
    if (!dragging || dragging.roomId !== roomId) return false;
    const [lo, hi] = [
      Math.min(dragging.startIdx, dragging.endIdx),
      Math.max(dragging.startIdx, dragging.endIdx),
    ];
    return dayIdx >= lo && dayIdx <= hi;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="sticky top-0 bg-slate-100">
            <th className="p-3 text-left w-48">Room</th>
            {days.map((d) => (
              <th
                key={d}
                className="p-2 text-xs font-semibold text-slate-700 border-l border-slate-200"
              >
                <div>
                  {new Date(d).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </div>
                <div className="text-[11px] opacity-70">
                  {new Date(d).toLocaleDateString()}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody onMouseLeave={() => setDragging(null)}>
          {ROOMS.map((room) => (
            <tr key={room.id} className="border-t border-slate-200">
              <td className="p-3 font-medium bg-slate-50">{room.name}</td>
              {days.map((d, idx) => (
                <td
                  key={d}
                  onMouseDown={() => beginDrag(room.id, idx)}
                  onMouseMove={(e) => e.buttons === 1 && updateDrag(idx)}
                  onMouseUp={endDrag}
                  className={
                    "relative h-12 cursor-pointer select-none border-l border-slate-100 hover:bg-sky-50 " +
                    (isSelected(room.id, idx) ? "bg-sky-100" : "")
                  }
                >
                  {roomBookings(room.id)
                    .filter((b) => rangeOverlaps(b.start, b.end, d, d))
                    .map((b) => (
                      <div
                        key={b.id}
                        title={`${b.guestName} (${b.start}–${b.end})`}
                        className="absolute inset-1 rounded-md bg-emerald-500/90 px-2 text-xs font-semibold text-white flex items-center justify-between"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this booking?"))
                            deleteBooking(b.id);
                        }}
                      >
                        <span className="truncate">{b.guestName}</span>
                        <span className="ml-2 opacity-80">×</span>
                      </div>
                    ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          <BookingForm
            roomName={ROOMS.find((r) => r.id === modal.roomId)?.name ?? "Room"}
            start={modal.start}
            end={modal.end}
            onCreate={createBooking}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        ref={ref}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function BookingForm(props: {
  roomName: string;
  start: string;
  end: string;
  onCreate: (guest: string, notes?: string) => void;
}) {
  const [guestName, setGuestName] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">New Booking</h2>
      <p className="text-sm text-slate-600 mb-4">
        {props.roomName}
        <br />
        {props.start} → {props.end}
      </p>
      <label className="block text-sm font-medium mb-1">
        Guest / Reference
      </label>
      <input
        className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        placeholder="e.g. Smith Family"
      />
      <label className="block text-sm font-medium mb-1">Notes (optional)</label>
      <textarea
        className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Cabin access 2pm, paid cash, etc."
      />
      <div className="flex gap-2 justify-end">
        <button
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => {
            const name = guestName.trim();
            if (!name) return;
            props.onCreate(name, notes.trim() || undefined);
          }}
          disabled={!guestName.trim()}
          title={!guestName.trim() ? "Enter a name" : "Create booking"}
        >
          Create booking
        </button>
      </div>
    </div>
  );
}
