export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <section className="max-w-5xl px-6 text-center">
        
        {/* HERO IMAGE */}
        <img
          src="https://ibb.co/VpTS90tq"
          alt="Energy future"
          className="mx-auto mb-8 rounded-lg opacity-90"
        />

        {/* TAGLINE 1 */}
        <h1 className="text-4xl md:text-6xl font-semibold mb-4">
          Stablecoin backed by energy
        </h1>

        {/* TAGLINE 2 */}
        <p className="text-lg md:text-xl text-gray-300 mb-8">
          Building a Kardashev Type I civilization.
        </p>

        {/* BUTTONS */}
        <div className="flex justify-center gap-4">
          <a
            href="#"
            className="px-6 py-3 bg-white text-black rounded-md font-medium hover:opacity-90"
          >
            Join Community
          </a>

          <a
            href="#"
            className="px-6 py-3 border border-white rounded-md font-medium hover:bg-white hover:text-black"
          >
            Explore Docs
          </a>
        </div>

      </section>
    </main>
  );
}
