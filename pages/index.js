import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import {
    getBalance,
    formatNearAmount,
} from '@neardefi/shade-agent-js';
import Overlay from '../components/Overlay';
import { EthereumVM } from '../utils/ethereum';
import { ethContractAbi } from '../utils/ethereum';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ethRpcUrl = 'https://sepolia.drpc.org';
const ethContractAddress = '0xb8d9b079F1604e9016137511464A1Fe97F8e2Bd8';
const Evm = new EthereumVM(ethRpcUrl);

export default function Home() {
    const [message, setMessage] = useState('');
    const [accountId, setAccountId] = useState();
    const [balance, setBalance] = useState({ available: '0' });
    const [ethAddress, setEthAddress] = useState('');
    const [ethBalance, setEthBalance] = useState('0');
    const [contractPrice, setContractPrice] = useState(null);
    const [lastTxHash, setLastTxHash] = useState(null);

    const setMessageHide = async (message, dur = 3000, success = false) => {
        setMessage({ text: message, success });
        await sleep(dur);
        setMessage('');
    };

    const getBalanceSleep = async (accountId) => {
        await sleep(1000);
        const balance = await getBalance(accountId);

        if (balance.available === '0') {
            getBalanceSleep(accountId);
            return;
        }
        setBalance(balance);
    };

    const getEthInfo = async () => {
        try {
            const { address } = Evm.deriveAddress(process.env.NEXT_PUBLIC_contractId, "ethereum-1");
            const balance = await Evm.getBalance(address);
            setEthAddress(address);
            setEthBalance(balance.toString());
        } catch (error) {
            console.error('Error fetching ETH info:', error);
        }
    };

    const getContractPrice = async () => {
        try {
            const price = await Evm.getContractViewFunction(
                ethContractAddress,
                ethContractAbi,
                'getPrice'
            );
            // Divide by 100 to get the actual price with 2 decimal places
            const displayPrice = (parseInt(price.toString()) / 100).toFixed(2);
            setContractPrice(displayPrice);
        } catch (error) {
            console.error('Error fetching contract price:', error);
        }
    };

    const deriveAccount = async () => {
        const res = await fetch('/api/derive').then((r) => r.json());
        setAccountId(res.accountId);
        getBalanceSleep(res.accountId);
    };

    useEffect(() => {
        deriveAccount();
        getEthInfo();
        getContractPrice();
        const interval = setInterval(() => {
            getEthInfo();
            getContractPrice();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.container}>
            <Head>
                <title>ETH Price Oracle</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Overlay message={message} />

            <main className={styles.main}>
                <h1 className={styles.title}>ETH Price Oracle</h1>
                <div className={styles.subtitleContainer}>
                    <h2 className={styles.subtitle}>Powered by Shade Agents</h2>
                </div>
                <p>
                    This is a simple example of a verifiable price oracle for an ethereum smart contract using shade agents.
                </p>
                <ol>
                    <li>
                        Fund the worker agent with testnet NEAR tokens (1 will do)
                    </li>
                    <li>
                        Fund the Ethereum Sepolia account (0.001 will do)
                    </li>
                    <li>
                        Register the worker agent in the NEAR smart contract
                    </li>
                    <li>
                        Send the ETH price to the Ethereum contract
                    </li>
                </ol>

                {contractPrice !== null && (
                    <div style={{ 
                        background: '#f5f5f5', 
                        padding: '1.25rem', 
                        borderRadius: '10px',
                        marginBottom: '1rem',
                        textAlign: 'center',
                        maxWidth: '350px',
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                    }}>
                        <h3 style={{ 
                            margin: '0 0 0.5rem 0',
                            color: '#666',
                            fontSize: '1.1rem'
                        }}>Current Set ETH Price</h3>
                        <p style={{ 
                            fontSize: '2rem', 
                            margin: '0',
                            fontFamily: 'monospace',
                            color: '#333'
                        }}>
                            ${contractPrice}
                        </p>
                    </div>
                )}
                {lastTxHash && (
                    <div style={{ 
                        marginBottom: '1.5rem',
                        textAlign: 'center',
                        maxWidth: '350px'
                    }}>
                        <a 
                            href={`https://sepolia.etherscan.io/tx/${lastTxHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                                color: '#0070f3', 
                                textDecoration: 'none',
                                fontSize: '0.9rem'
                            }}
                        >
                            View the transaction on Etherscan
                        </a>
                    </div>
                )}

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h3>Step 1.</h3>
                        <p>
                            Fund Worker Agent account:
                            <br />
                            <br />
                            {accountId?.length >= 24
                                ? accountId?.substring(0, 24) + '...'
                                : accountId}
                            <br />
                            <button
                                className={styles.btn}
                                onClick={() => {
                                    try {
                                        if(navigator.clipboard && navigator.clipboard.writeText) {
                                            navigator.clipboard.writeText(accountId);
                                            setMessageHide('Copied', 500, true);
                                        } else {
                                            setMessageHide('Clipboard not supported', 3000, true);
                                        }
                                    } catch (e) {
                                        setMessageHide('Copy failed', 3000, true);
                                    }
                                }}
                            >
                                copy
                            </button>
                            <br />
                            <br />
                            balance:{' '}
                            {balance
                                ? formatNearAmount(balance.available, 4)
                                : 0}
                            <br />
                            <a 
                                href="https://near-faucet.io/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                    color: '#0070f3', 
                                    textDecoration: 'none',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Get Testnet NEAR tokens from faucet →
                            </a>
                        </p>
                    </div>

                    <div className={styles.card}>
                        <h3>Step 2.</h3>
                        <p>
                            Fund the Ethereum Sepolia account:
                            <br />
                            <br />
                            {ethAddress ? (
                                <>
                                    {ethAddress.substring(0, 6)}...{ethAddress.substring(ethAddress.length - 4)}
                                    <br />
                                    <button
                                        className={styles.btn}
                                        onClick={() => {
                                            try {
                                                if(navigator.clipboard && navigator.clipboard.writeText) {
                                                    navigator.clipboard.writeText(ethAddress);
                                                    setMessageHide('Copied', 500, true);
                                                } else {
                                                    setMessageHide('Clipboard not supported', 3000, true);
                                                }
                                            } catch (e) {
                                                setMessageHide('Copy failed', 3000, true);
                                            }
                                        }}
                                    >
                                        copy
                                    </button>
                                    <br />
                                    <br />
                                    Balance: {ethBalance ? Number(ethBalance).toFixed(4) : '0'} ETH
                                    <br />
                                    <a 
                                        href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                            color: '#0070f3', 
                                            textDecoration: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        Get Sepolia ETH from faucet →
                                    </a>
                                </>
                            ) : (
                                'Loading...'
                            )}
                        </p>
                    </div>

                    <a
                        href="#"
                        className={styles.card}
                        onClick={async () => {
                            if (process.env.NODE_ENV !== 'production') {
                                setMessageHide(
                                    <>
                                        <p>Registration not needed in development mode</p>
                                        <p className={styles.code}>
                                            TEE operations are only available in production
                                        </p>
                                    </>,
                                    3000,
                                    true
                                );
                                return;
                            }

                            setMessage({ 
                                text: 'Registering Worker',
                                success: true
                            });

                            try {
                                const res = await fetch('/api/register').then(
                                    (r) => r.json(),
                                );
                                
                                setMessageHide(
                                    <>
                                        <p>register_worker response:</p>
                                        <p className={styles.code}>
                                            registered: {JSON.stringify(res.registered)}
                                        </p>
                                    </>,
                                    3000,
                                    true
                                );
                            } catch (e) {
                                console.error(e);
                                setMessageHide(
                                    <>
                                        <p>Error registering worker:</p>
                                        <p className={styles.code}>
                                            {e.message || 'An unexpected error occurred'}
                                        </p>
                                    </>,
                                    3000,
                                    true
                                );
                            }
                        }}
                    >
                        <h3>Step 3.</h3>
                        <p>
                            Register the Worker Agent in the smart
                            contract:
                            <br />
                            <br />
                            {process.env.NEXT_PUBLIC_contractId}
                        </p>
                    </a>

                    <a
                        href="#"
                        className={styles.card}
                        onClick={async () => {
                            setMessage({ 
                                text: 'Querying and sending the ETH price to the Ethereum contract...',
                                success: false
                            });

                            try {
                                const res = await fetch('/api/sendPrice').then((r) => r.json());

                                if (res.verified) {
                                    await getContractPrice();
                                    setLastTxHash(res.txHash);
                                    setMessageHide(
                                        <>
                                            <p>Successfully set the ETH price!</p>
                                        </>,
                                        3000,
                                        true
                                    );
                                } else {
                                    setMessageHide(
                                        <>
                                            <h3>Error</h3>
                                            <p>
                                            Check the Worker Agent is registered.
                                            </p>
                                        </>,
                                        3000,
                                        true
                                    );
                                }
                            } catch (e) {
                                console.error(e);
                                setMessageHide(
                                    <>
                                        <h3>Error</h3>
                                        <p>
                                        Check the the Worker Agent and Ethereum account have been funded.
                                        </p>
                                    </>,
                                    3000,
                                    true
                                );
                            }
                        }}
                    >
                        <h3>Set ETH Price</h3>
                        <p>(requires registration)</p>
                        <p className={styles.code}>
                            Click to set the ETH price in the smart contract
                        </p>
                    </a>
                </div>
            </main>

            <footer className={styles.footer}>
                <a
                    href="https://proximity.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img
                        src="/symbol.svg"
                        alt="Proximity Logo"
                        className={styles.logo}
                    />
                    <img
                        src="/wordmark_black.svg"
                        alt="Proximity Logo"
                        className={styles.wordmark}
                    />
                </a>
            </footer>
        </div>
    );
}
