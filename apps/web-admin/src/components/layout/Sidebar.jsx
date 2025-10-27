"use client";
import Link from "next/link";
import { LayoutDashboard, FileUser, MessageSquare, TriangleAlert, Settings, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/drivers", label: "Driver Registration", icon: FileUser },
  { href: "/feedback", label: "User Feedback", icon: MessageSquare },
  { href: "/incidents", label: "Incident Reports", icon: TriangleAlert },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar(){
  const path = usePathname();
  const r = useRouter();

  function logout(){
    localStorage.removeItem("lc_token");
    localStorage.removeItem("lc_user");
    r.replace("/login");
  }

  return (
    <aside style={S.aside}>
      <nav style={{display:"grid",gap:8, marginTop:8}}>
        {NAV.map(({href,label,icon:Icon})=>{
          const active = path === href;
          return (
            <Link key={href} href={href} style={{ ...S.item, ...(active ? S.active : {}) }}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <button onClick={logout} style={{...S.item, ...S.logout}}>
        <LogOut size={16}/><span>Logout</span>
      </button>
    </aside>
  );
}

const S = {
  aside:{
    width:220,background:"var(--card)",borderRight:"1px solid var(--line)",
    padding:12,display:"flex",flexDirection:"column",gap:12
  },
  item:{
    display:"flex",alignItems:"center",gap:10,
    padding:"10px 12px",borderRadius:12,textDecoration:"none",
    color:"var(--text)",opacity:.9,border:"1px solid transparent",
    background:"transparent"
  },
  active:{
    background:"rgba(14,107,143,.12)",border:"1px solid var(--line-strong)"
  },
  logout:{
    marginTop:"auto",color:"#ff726e",border:"1px solid rgba(255,114,110,.3)",
    background:"rgba(255,114,110,.08)"
  }
};
