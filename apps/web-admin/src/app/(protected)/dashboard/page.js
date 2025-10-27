export const metadata = { title: "Dashboard" };

export default function Dashboard(){
  return (
    <div style={{display:"grid",gap:16}}>
      {/* Page title & subtext (no ADMIN here now) */}
      <div>
        <h1 style={{fontSize:22,fontWeight:800,margin:0}}>Dashboard Overview</h1>
        <p style={{margin:"6px 0 0", color:"var(--muted)"}}>
          Welcome back! Here’s what’s happening today.
        </p>
      </div>

      <section style={card}>
        <div style={{fontWeight:700,marginBottom:6}}>Incident Reports Over Time</div>
        <div style={{color:"var(--muted)",fontSize:13,marginBottom:12}}>
          Track incident trends across time with detailed analytics.
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
          {[
            ["48","Total Incidents","Last 30 Days"],
            ["4.4","Average per day","Last 30 Days"],
            ["0%","Change","vs previous period"]
          ].map(([big, title, sub])=>(
            <div key={title} style={tile}>
              <div style={{fontSize:26,fontWeight:800,marginBottom:4}}>{big}</div>
              <div style={{fontWeight:600}}>{title}</div>
              <div style={{fontSize:12,color:"var(--muted)"}}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Chart placeholder */}
        <div style={{
          marginTop:14,height:260,border:"1px dashed var(--line)",borderRadius:12,
          display:"grid",placeItems:"center",color:"var(--muted)"
        }}>
          Chart goes here
        </div>
      </section>
    </div>
  );
}

const card = {
  background:"var(--card)",
  border:"1px solid var(--line)",
  borderRadius:16,
  padding:16
};
const tile = {
  background:"rgba(14,107,143,.08)",
  border:"1px solid var(--line)",
  borderRadius:12,
  padding:12
};
