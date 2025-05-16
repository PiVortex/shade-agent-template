import styles from '../styles/Home.module.css';

export default function Overlay({ message }) {
    if (!message) return [];

    return (
        <div className={styles.overlay}>
            <div className={styles.message}>
                {message.text}
                {!message.success && (
                    <div className={styles.spinnerContainer}>
                        <img 
                            src="/symbol.svg" 
                            alt="Proximity Logo" 
                            className={styles.spinningLogo}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
