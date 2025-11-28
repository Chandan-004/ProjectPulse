import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet, useNavigate } from 'react-router-dom' // Added useNavigate
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
import { useUser, SignIn, useAuth, CreateOrganization } from '@clerk/clerk-react'
import { fetchWorkspaces } from '../features/workspaceSlice'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    useEffect(() => {
        // FIX 1: Check !loading to prevent double fetching
        // FIX 2: Use user?.id instead of whole user object to prevent unnecessary re-runs
        if (isLoaded && user && workspaces.length === 0 && !loading) {
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [user?.id, isLoaded, workspaces.length]) // Changed dependencies

    if (!isLoaded) {
        return (
            <div className='flex items-center justify-center h-screen bg-white'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                <SignIn />
            </div>
        )
    }

    // FIX 3: Don't show loader if we are just waiting for workspaces but already have the user.
    // This prevents the CreateOrganization form from unmounting if a background fetch happens.
    if (loading && workspaces.length > 0) return (
        <div className='flex items-center justify-center h-screen bg-white'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )

    if (workspaces.length === 0) {
        return (
            <div className='min-h-screen flex justify-center items-center'>
                {/* FIX 4: Add afterCreateOrganizationUrl */}
                {/* This forces Clerk to navigate away after success, preventing the "loop" */}
                <CreateOrganization 
                    afterCreateOrganizationUrl="/"
                    skipInvitationScreen={true} // Optional: smoother flow
                />
            </div>
        )
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout