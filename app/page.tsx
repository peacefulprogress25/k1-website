export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* HERO SECTION */}
      <section className="relative w-full h-screen">

        {/* FULL-WIDTH HERO IMAGE */}
        <img
          src="https://i.ibb.co/n8rmQCCr/Chat-GPT-Image-Jan-1-2026-04-23-21-PM-1.jpg"
          alt="K1 energy-backed future"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* DARK OVERLAY FOR READABILITY */}
        <div className="absolute inset-0 bg-black/40" />

        {/* LEFT-ALIGNED CONTENT */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-2xl px-8 md:px-16 text-left">

            <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-6">
              K1
            </h1>

            <p className="text-lg md:text-2xl text-gray-200 mb-10">
              An energy-backed stablecoin financing the transition to a
              Kardashev Type I civilization.
            </p>

            {/* CTA BUTTONS */}
            <div className="flex gap-6">
              <a
                href="https://t.me/+MWUrdlbcUbE4MzA1"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3 bg-white text-black rounded-md font-medium hover:opacity-90 transition"
              >
                Join Community
              </a>

              <a
