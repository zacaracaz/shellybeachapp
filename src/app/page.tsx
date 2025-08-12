import BookingGrid from "@/components/BookingGrid";

export default function Page() {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-bold mb-4">Welcome to Shelly Beach - Booking App</h1>
        <p className="text-sm text-slate-600 mb-6">
          Click or drag across dates to create a booking.
        </p>
        <BookingGrid />
      </div>
    </main>
  );
}
