import { TappdClient } from '../../utils/tappd';
import 'dotenv/config';
import { contractCall } from '@neardefi/shade-agent-js';
import { contracts, chainAdapters } from 'chainsig.js';
import { createPublicClient, http } from "viem";
import { Contract, JsonRpcProvider } from 'ethers';
export const dynamic = 'force-dynamic';

const endpoint = process.env.DSTACK_SIMULATOR_ENDPOINT;
const ethRpcUrl = 'https://sepolia.drpc.org';
const contractId = process.env.NEXT_PUBLIC_contractId;
const ethContractAddress = '0x0414Da715f522d3952A09c52310780f76FE33291';

const MPC_CONTRACT = new contracts.ChainSignatureContract({
    networkId: 'testnet',
    contractId: 'v1.signer-prod.testnet',
});

const publicClient = createPublicClient({
    transport: http(ethRpcUrl),
});

const Evm = new chainAdapters.evm.EVM({
    publicClient,
    contract: MPC_CONTRACT,
});

export default async function sendRandom(req, res) {
    const client = new TappdClient(endpoint);

    // Generate random number between 1 and 1000
    const random_number = Math.floor(Math.random() * 1000) + 1;

    // get tcb info from tappd
    const { tcb_info } = await client.getInfo();
    const { app_compose } = JSON.parse(tcb_info);
    // first sha256: match of docker-compose.yaml will be codehash (arrange docker-compose.yaml accordingly)
    let [codehash] = app_compose.match(/sha256:([a-f0-9]*)/gim);

    codehash = codehash.replace('sha256:', '');

    const {transaction, hashesToSign} = await createEthTx(random_number, ethContractAbi);

    let verified = false;
    let signRes;
    try {
        signRes = await contractCall({
            methodName: 'send_random_number',
            args: {
                codehash,
                hashesToSign,
            },
        });
        verified = true;
        
    } catch (e) {
        verified = false;
    }

    console.log(signRes);

    const signedTx = Evm.finalizeTransactionSigning({
        transaction,
        rsvSignatures: signRes,
    })

    const txHash = await Evm.broadcastTx(signedTx);
    console.log(txHash);

    res.status(200).json({ verified, random_number });
}

async function createEthTx(random_number, ethContractAbi) {

      const provider = new JsonRpcProvider(ethRpcUrl);
      const contract = new Contract(ethContractAddress, ethContractAbi, provider);
      const data = contract.interface.encodeFunctionData("updateRandom", [random_number]);

      const { address } = await Evm.deriveAddressAndPublicKey(
        contractId,
        'ethereum-1'
      );
      
      console.log('Derived Ethereum address:', address);

      const {transaction, hashesToSign} = await Evm.prepareTransactionForSigning({
        from: address,
        to: ethContractAddress,
        data,
      });
      

      return {transaction, hashesToSign};
}

const ethContractAbi = [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_random",
          "type": "uint256"
        }
      ],
      "name": "updateRandom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getRandom",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]  