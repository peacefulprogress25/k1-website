export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <section className="max-w-6xl px-6 text-center">

        {/* HERO IMAGE */}
        <img
          src="https://ibb.co/Pzxj1QQx"
          alt="Future energy infrastructure"
          className="mx-auto mb-12 rounded-xl opacity-90"
        />

        {/* TAGLINE 1 */}
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-6">
        Stablecoin backed by energy
        </h1>

        {/* TAGLINE 2 */}
        <p className="text-lg md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10">
          Building Kardashev Type 1 civilization.
        </p>

        {/* CTA BUTTONS */}
        <div className="flex justify-center gap-6">
          <a
            href="https://t.me/+MWUrdlbcUbE4MzA1"
            target="_blank"
            className="px-7 py-3 bg-white text-black rounded-md font-medium hover:opacity-90 transition"
          >
            Join Community
          </a>

          <a
            href="https://solarpunkdao.gitbook.io/k1/"
            target="_blank"
            className="px-7 py-3 border border-white/30 rounded-md font-medium hover:bg-white hover:text-black transition"
          >
            Explore Docs
          </a>
        </div>

      </section>
    </main>
  );
}
