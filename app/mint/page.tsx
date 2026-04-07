import styles from "./page.module.css";


export default function MintPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <a href="#" className={styles.brandLogo}>
            K1_Terminal.exe
          </a>
          <nav className={styles.navLinks}>
            <a href="#">01_Docs</a>
            <a href="#">02_Twitter</a>
            <a href="#">03_Telegram</a>
          </nav>
        </header>

        <section className={styles.heroGrid}>
          <div className={styles.card}>
            <div className={styles.priceHeader}>
              <div>
                <div className={styles.labelSm}>Market_Price / USDC</div>
                <div className={styles.priceHero}>$1.0204</div>
              </div>
              <div className={styles.rangeLabel}>Range: 7D_History</div>
            </div>
            <div className={styles.priceChartContainer}>
              <svg width="100%" height="100%" viewBox="0 0 1000 100" preserveAspectRatio="none">
                <path
                  className={styles.sparklinePath}
                  d="M0,85 L100,82 L200,88 L300,60 L400,72 L500,45 L600,55 L700,25 L800,35 L900,15 L1000,10"
                />
              </svg>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.walletMini}>
              <div className={styles.liveDot} />
              Connected: 0x7a8F...4f9C
            </div>
            <div className={styles.txTabs}>
              <button className={`${styles.txTab} ${styles.active}`}>01_Mint</button>
              <button className={styles.txTab}>02_Redeem</button>
            </div>
            <div className={styles.labelSm}>Input_Amount</div>
            <div className={styles.inputRow}>
              <input type="text" placeholder="0.00" />
              <div className={styles.tokenBadge}>USDC</div>
            </div>
            <div className={styles.labelSm}>Output_Estimated</div>
            <div className={styles.inputRow}>
              <input type="text" placeholder="0.00" readOnly />
              <div className={styles.tokenBadge}>K1</div>
            </div>
            <button className={styles.txSubmit}>Execute_Transaction</button>
            <div className={styles.balanceSection}>
              <div className={styles.labelSm}>Current_Balance</div>
              <div className={styles.numStat}>4,250.00 K1</div>
            </div>
          </div>
        </section>

        <section className={styles.statsBar}>
          <div className={styles.statItem}>
            <div className={styles.labelSm}>Protocol_TVL</div>
            <div className={styles.numStat}>142.50M</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.labelSm}>Node_Holders</div>
            <div className={styles.numStat}>12,482</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.labelSm}>Yield_Distributed</div>
            <div className={styles.numStat}>8.21M</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.labelSm}>System_Points</div>
            <div className={styles.numStat}>8,450</div>
            <div className={styles.subInfo}>∆ +120 Weekly</div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.treasuryCard}`}>
          <div>
            <div className={styles.labelSm}>Reserve_Allocation</div>
            <div className={styles.reserveText}>
              [ ████████░░░░░░░░░░░░ ] 40% BTC
              <br />
              [ ██████░░░░░░░░░░░░░░ ] 30% ETH
              <br />
              [ ████░░░░░░░░░░░░░░░░ ] 20% RWA
              <br />[ ██░░░░░░░░░░░░░░░░░░ ] 10% NRG
            </div>
          </div>
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div className={styles.dot} />BTC_Primary
            </div>
            <div className={styles.legendItem}>
              <div className={styles.dot} />ETH_Staked
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.dot} ${styles.outline}`} />RWA_Credit
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.dot} ${styles.outline}`} />Energy_Grid
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
