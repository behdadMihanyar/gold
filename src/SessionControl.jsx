import React, { useEffect, useState } from "react";
import supabase from "./supabase";
import Tasks from "./AddOrder";
import LogIn from "./LogIn";

const SessionControl = () => {
  const [session, setSession] = useState(null);
  console.log(session);
  const checkSession = async () => {
    const currentSession = await supabase.auth.getSession();
    setSession(currentSession.data.session);
  };
  useEffect(() => {
    checkSession();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup
    return () => data.subscription.unsubscribe();
  }, []);
  return <div>{session ? <Tasks /> : <LogIn />}</div>;
};

export default SessionControl;
