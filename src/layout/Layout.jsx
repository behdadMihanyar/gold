import { Outlet, NavLink } from "react-router-dom";

function Layout() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen ">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-6">My App</h2>

        <nav className="flex flex-col gap-4 flex-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "text-sky-400 no-underline" : "text-white no-underline"
            }
          >
            سفارشات
          </NavLink>

          <NavLink
            to="/addOrder"
            className={({ isActive }) =>
              isActive ? "text-sky-400 no-underline" : "text-white no-underline"
            }
          >
            افزودن سفارش
          </NavLink>

          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              isActive ? "text-sky-400 no-underline" : "text-white no-underline"
            }
          >
            Settings
          </NavLink>

          <button
            onClick={handleLogout}
            className="mt-8 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded cursor-pointer"
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-slate-100">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
