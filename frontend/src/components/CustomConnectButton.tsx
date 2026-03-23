import { ConnectButton } from '@rainbow-me/rainbowkit';

export function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="font-mono text-sm uppercase tracking-wider px-4 py-2 border border-[#00ff66]/30 text-[#00ff66] bg-[#00ff66]/10 hover:bg-[#00ff66]/20 transition-all rounded"
                  >
                    Authenticate
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="font-mono text-sm uppercase tracking-wider px-4 py-2 border border-red-500/50 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all rounded"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-3">
                  <button
                    onClick={openChainModal}
                    className="hidden sm:flex items-center gap-2 font-mono text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded border border-white/10 transition-colors"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 14, height: 14 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="font-mono text-sm tracking-wider px-4 py-2 border border-[#00d4ff]/30 text-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 transition-all rounded flex items-center gap-2"
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
