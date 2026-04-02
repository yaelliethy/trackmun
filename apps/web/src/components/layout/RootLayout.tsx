import React from "react"
import { Outlet } from "react-router-dom"
import { RootRedirect } from "../common/RootRedirect"
import { useLocation } from "react-router-dom"

export const RootLayout: React.FC = () => {
  const location = useLocation()
  
  // If we are at the exact root, we might want a redirect
  if (location.pathname === "/") {
     return <RootRedirect />
  }

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  )
}
