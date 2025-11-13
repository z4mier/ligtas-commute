"use client";
import { Bell } from "lucide-react";

export default function Topbar(){
  return (
    <header style={S.bar}>
      {/* Left brand */}
      <div style={S.brand}>ADMIN</div>

      {/* Right actions */}
      <div style={S.right}>
        <button aria-label="Notifications" style={S.iconBtn}>
          <Bell size={18}/>
        </button>
      </div>
    </header>
  );
}

const S = {
  bar:{
    height:64,
    display:"flex",
    alignItems:"center",
    justifyContent:"space-between",
    background:"var(--card)",
    borderBottom:"1px solid var(--line)",
    padding:"0 20px",
    position:"sticky",
    top:0,
    zIndex:10
  },
  brand:{
    fontWeight:800,
    letterSpacing:.6,
    fontSize:18
  },
  right:{display:"flex",gap:10,alignItems:"center"},
  iconBtn:{
    height:36,width:36,display:"grid",placeItems:"center",
    background:"rgba(14,107,143,.08)",
    border:"1px solid var(--line)",
    borderRadius:10,
    color:"var(--text)",
    cursor:"pointer"
  }
};
