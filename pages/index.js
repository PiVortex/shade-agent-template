import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useState, useEffect } from 'react';
import {
    contractView,
    getBalance,
    formatNearAmount,
} from '@neardefi/shade-agent-js';
import Overlay from '../components/Overlay';
import { EthereumVM } from '../utils/ethereum';
import { ethContractAbi } from '../utils/ethereum';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ethRpcUrl = 'https://sepolia.drpc.org';
const ethContractAddress = '0x0414Da715f522d3952A09c52310780f76FE33291';
const Evm = new EthereumVM(ethRpcUrl);

export default function Home() {
    const [message, setMessage] = useState('');
    const [accountId, setAccountId] = useState();
    const [balance, setBalance] = useState({ available: '0' });
    const [ethAddress, setEthAddress] = useState('');
    const [ethBalance, setEthBalance] = useState('0');
    const [contractRandom, setContractRandom] = useState(null);
    const [lastTxHash, setLastTxHash] = useState(null);

    const setMessageHide = async (message, dur = 3000, success = false) => {
        setMessage({ text: message, success });
        if (success) {
            // For success messages, show the stopped logo briefly
            await sleep(1000);
            setMessage('');
        } else {
            await sleep(dur);
            setMessage('');
        }
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

    const getContractRandom = async () => {
        try {
            const random = await Evm.getContractViewFunction(
                ethContractAddress,
                ethContractAbi,
                'getRandom'
            );
            setContractRandom(random.toString());
        } catch (error) {
            console.error('Error fetching contract random:', error);
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
        getContractRandom();
        const interval = setInterval(() => {
            getEthInfo();
            getContractRandom();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.container}>
            <Head>
                <title>Verifiable Random Number</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Overlay message={message} />

            <main className={styles.main}>
                <h1 className={styles.title}>Verifiable Random Numbers</h1>
                <h2 className={styles.subtitle}> Powered by Shade Agents</h2>
                <p>
                    This is a simple example of a verifiable random number oracle for an ethereum smart contract using shade agents.
                </p>
                <ol>
                    <li>
                        Fund the worker agent with NEAR tokens (0.1 NEAR will do)
                    </li>
                    <li>
                        Fund the Ethereum Sepolia account (0.0005 ETH will do)
                    </li>
                    <li>
                        Register the worker agent in the NEAR smart contract
                    </li>
                    <li>
                        Send a verifiable random number to the Ethereum contract
                    </li>
                </ol>

                {contractRandom !== null && (
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
                        }}>Current Random Number</h3>
                        <p style={{ 
                            fontSize: '2rem', 
                            margin: '0',
                            fontFamily: 'monospace',
                            color: '#333'
                        }}>
                            {contractRandom}
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
                                            setMessageHide('Copied', 500);
                                        } else {
                                            setMessageHide('Clipboard not supported');
                                        }
                                    } catch (e) {
                                        setMessageHide('Copy failed');
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
                                                    setMessageHide('Copied', 500);
                                                } else {
                                                    setMessageHide('Clipboard not supported');
                                                }
                                            } catch (e) {
                                                setMessageHide('Copy failed');
                                            }
                                        }}
                                    >
                                        copy
                                    </button>
                                    <br />
                                    <br />
                                    Balance: {ethBalance ? Number(ethBalance).toFixed(4) : '0'} ETH
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
                            setMessage('Registering Worker');

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
                                    5000
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
                                text: 'Generating and sending a random number to the Ethereum contract...',
                                success: false
                            });

                            try {
                                const res = await fetch('/api/sendRandom').then((r) => r.json());

                                if (res.verified) {
                                    // Refresh the contract random number after successful send
                                    await getContractRandom();
                                    setLastTxHash(res.txHash);
                                    setMessageHide(
                                        <>
                                            <p>Successfully set a random number!</p>
                                        </>,
                                        2000,
                                        true
                                    );
                                } else {
                                    setMessageHide(
                                        <>
                                            <p>Worker agent not verified</p>
                                        </>,
                                        2000,
                                        false
                                    );
                                }
                            } catch (e) {
                                console.error(e);
                                setMessageHide(
                                    <>
                                        <p>Error sending random number:</p>
                                        <p className={styles.code}>
                                            {e.message || 'An unexpected error occurred'}
                                        </p>
                                    </>,
                                    5000,
                                    false
                                );
                            }
                        }}
                    >
                        <h3>Send Random Number</h3>
                        <p>(requires registration)</p>
                        <p className={styles.code}>
                            Click to send a random number between 1 and 1000
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
                    Powered by{' '}
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
