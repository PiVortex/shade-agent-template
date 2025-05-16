import { TappdClient } from '../../utils/tappd';
import 'dotenv/config';
import { contractCall } from '@neardefi/shade-agent-js';
import { EthereumVM } from '../../utils/ethereum';
import { ethContractAbi } from '../../utils/ethereum';

export const dynamic = 'force-dynamic';

const endpoint = process.env.DSTACK_SIMULATOR_ENDPOINT;
const ethRpcUrl = 'https://sepolia.drpc.org';
const contractId = process.env.NEXT_PUBLIC_contractId;
const ethContractAddress = '0x0414Da715f522d3952A09c52310780f76FE33291';

const Evm = new EthereumVM(ethRpcUrl);

export default async function sendRandom(req, res) {
    const client = new TappdClient(endpoint);

    // Get codehash based on environment
    let codehash; // Default for non-TEE environment
    
    if (process.env.NODE_ENV === 'production') {
      const { tcb_info } = await client.getInfo();
      const { app_compose } = JSON.parse(tcb_info);
      let [codehashMatch] = app_compose.match(/sha256:([a-f0-9]*)/gim) || [];
      if (codehashMatch) {
        codehash = codehashMatch.replace('sha256:', '');
      }
    } else {
        codehash = 1;
    }

    // Generate random number between 1 and 1000
    const random_number = Math.floor(Math.random() * 1000) + 1;
    const {payload, transaction} = await getRandomNumberPayload(random_number);
    console.log(payload);

    let verified = false;
    let signRes;
    let errorMessage;
    // Call the near smart contract to get a signature for the payload
    try {
        signRes = await contractCall({
            methodName: 'send_random_number',
            args: {
                codehash,
                payload,
            },
        });
        verified = true;
        
    } catch (e) {
        verified = false;
        console.error('Contract call error:', e);
        errorMessage = e.message || 'Failed to send random number';
    }

    if (!verified) {
        res.status(400).json({ verified, error: errorMessage });
        return;
    }

    // Reconstruct the signed transaction
    const {big_r, s, recovery_id} = signRes;
    const signedTransaction = await Evm.reconstructSignedTransaction(
      big_r,
      s,
      recovery_id,
      transaction
    );

    // Broadcast the signed transaction
    const txHash = await Evm.broadcastTX(signedTransaction);

    res.status(200).json({ verified, txHash });
}

async function getRandomNumberPayload(random_number) {
  const { address: senderAddress } = Evm.deriveAddress(contractId, "ethereum-1");
  const data = Evm.createTransactionData(ethContractAddress, ethContractAbi, 'updateRandom', [random_number]);
  const { transaction } = await Evm.createTransaction({
    sender: senderAddress,
    receiver: ethContractAddress,
    amount: 0,
    data,
  });
  const payload = await Evm.getPayload({ transaction });
  return {payload, transaction};
}