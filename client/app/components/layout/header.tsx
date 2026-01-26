import { ControllerConnector } from "@cartridge/connector";
import { useAccount, useDisconnect, useConnect } from "@starknet-react/core";
import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useWalletModal } from "../../providers/wallet-modal-provider";
import { truncateAddress } from "../../lib/utils/formatters";
import BridgeModal from "../bridge/bridge-modal";

export default function Header() {
    const { disconnect } = useDisconnect();
    const { address, connector } = useAccount();
    const { connectors } = useConnect();
    const controller = useMemo(() => {
        try {
            return ControllerConnector.fromConnectors(connectors);
        } catch {
            return undefined;
        }
    }, [connectors]);

    // Check if connected wallet is Cartridge (not Ready or Braavos)
    const isCartridge = useMemo(() => {
        if (!connector) return false;
        const connectorId = connector.id?.toLowerCase() || '';
        const connectorName = connector.name?.toLowerCase() || '';
        const isReadyOrBraavos =
            connectorId === 'argent' ||
            connectorId === 'ready' ||
            connectorId === 'braavos' ||
            connectorName.includes('argent') ||
            connectorName.includes('ready') ||
            connectorName.includes('braavos');
        return !isReadyOrBraavos && controller !== undefined;
    }, [connector, controller]);

    const [username, setUsername] = useState<string | undefined>(undefined);
    const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const { openWalletModal } = useWalletModal();

    // Only fetch username for Cartridge wallet
    useEffect(() => {
        if (!address || !controller || !isCartridge) {
            setUsername(undefined);
            return;
        }

        let isCancelled = false;
        let retryHandle: ReturnType<typeof setTimeout> | undefined;

        const fetchUsername = async (attemptsRemaining: number) => {
            if (isCancelled) return;

            if (!controller.isReady()) {
                if (attemptsRemaining > 0) {
                    retryHandle = setTimeout(() => fetchUsername(attemptsRemaining - 1), 500);
                }
                return;
            }

            try {
                const name = await controller.username();
                if (isCancelled) return;

                if (name) {
                    setUsername(name);
                } else if (attemptsRemaining > 0) {
                    retryHandle = setTimeout(() => fetchUsername(attemptsRemaining - 1), 500);
                }
            } catch (error) {
                console.error("Failed to load username from controller", error);
                if (attemptsRemaining > 0) {
                    retryHandle = setTimeout(() => fetchUsername(attemptsRemaining - 1), 500);
                }
            }
        };

        fetchUsername(8);

        return () => {
            isCancelled = true;
            if (retryHandle) {
                clearTimeout(retryHandle);
            }
        };
    }, [address, controller, isCartridge])

    useEffect(() => {
        if (!address) {
            setUsername(undefined);
        }
    }, [address]);

    const handleConnect = () => {
        openWalletModal();
    };

    const handleDisconnect = async () => {
        disconnect();
        setUsername(undefined);
    };

    const handleOpenProfile = () => {
        if (isCartridge && connector) {
            try {
                (connector as any)?.controller?.openProfile("inventory");
            } catch (error) {
                console.error("Failed to open profile:", error);
            }
        }
    };

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement search functionality
        console.log("Search:", searchQuery);
    }, [searchQuery]);

    return (
        <>
            <BridgeModal isOpen={isBridgeModalOpen} onClose={() => setIsBridgeModalOpen(false)} />

            {/* Premium Search-Dominant Header */}
            <header className="sticky top-0 z-50 w-full h-16 flex items-center justify-between px-4 md:px-6 border-b"
                style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)'
                }}
            >
                {/* Left: Logo */}
                <div className="flex-shrink-0 flex items-center gap-3">
                    <Image
                        src="/logo.png"
                        alt="Survivor Exchange"
                        width={40}
                        height={40}
                        draggable={false}
                        className="w-9 h-9 md:w-10 md:h-10"
                    />
                    <span className="hidden lg:block font-display text-lg tracking-wide"
                        style={{ color: 'var(--color-champagne)' }}
                    >
                        Survivor Exchange
                    </span>
                </div>

                {/* Center: Search Bar (Desktop) */}
                <form
                    onSubmit={handleSearch}
                    className="hidden md:flex flex-1 max-w-2xl mx-8"
                >
                    <div className="relative w-full">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search beasts, collections, auctions..."
                            className="w-full h-11 pl-12 pr-4 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                            style={{
                                backgroundColor: 'var(--color-bg)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text)',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--color-gold)';
                                e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.15)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--color-border)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                        {/* Search Icon */}
                        <svg
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                            style={{ color: 'var(--color-text-muted)' }}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </div>
                </form>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Mobile Search Toggle */}
                    <button
                        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
                        style={{
                            backgroundColor: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        <svg
                            className="w-5 h-5"
                            style={{ color: 'var(--color-text-muted)' }}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>

                    {/* Bridge Button */}
                    <button
                        onClick={() => setIsBridgeModalOpen(true)}
                        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg transition-all btn-ghost"
                        title="Bridge funds to Starknet"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M7 16V4M7 4L3 8M7 4L11 8" />
                            <path d="M17 8V20M17 20L21 16M17 20L13 16" />
                        </svg>
                        <span className="hidden md:inline text-sm">Bridge</span>
                    </button>

                    {/* Wallet Connection */}
                    {address ? (
                        <div className="flex items-center rounded-lg overflow-hidden"
                            style={{
                                border: '1px solid var(--color-gold)',
                                backgroundColor: 'rgba(212, 175, 55, 0.05)'
                            }}
                        >
                            <button
                                onClick={handleOpenProfile}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-all cursor-pointer"
                            >
                                {/* User Icon */}
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="var(--color-gold)"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M20 21a8 8 0 0 0-16 0" />
                                </svg>
                                <span className="text-sm font-medium"
                                    style={{ color: 'var(--color-champagne)' }}
                                >
                                    {username || truncateAddress(address)}
                                </span>
                            </button>
                            <div className="w-px h-6" style={{ backgroundColor: 'var(--color-gold)', opacity: 0.3 }} />
                            <button
                                onClick={handleDisconnect}
                                title="Disconnect"
                                className="flex items-center justify-center px-3 py-2 hover:bg-red-500/10 transition-all cursor-pointer group"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="var(--color-gold)"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="group-hover:stroke-red-500 transition-colors"
                                >
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleConnect}
                            className="group relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer animate-subtle-pulse btn-gold"
                        >
                            {/* Wallet icon */}
                            <svg
                                className="w-4 h-4 md:w-5 md:h-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                            </svg>
                            <span className="text-sm md:text-base font-semibold">
                                Connect
                            </span>
                        </button>
                    )}
                </div>
            </header>

            {/* Mobile Search Expanded */}
            {isSearchExpanded && (
                <div className="md:hidden p-3 border-b"
                    style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)'
                    }}
                >
                    <form onSubmit={handleSearch}>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search beasts, collections, auctions..."
                                className="w-full h-11 pl-12 pr-4 rounded-xl text-sm transition-all duration-200 focus:outline-none focus-gold"
                                style={{
                                    backgroundColor: 'var(--color-bg)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text)',
                                }}
                                autoFocus
                            />
                            <svg
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                                style={{ color: 'var(--color-text-muted)' }}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
