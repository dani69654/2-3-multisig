import { generateWallet, NETWORK } from './modules/wallet';
import { payments, Psbt } from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as tinysecp from 'tiny-secp256k1';

const bip32 = BIP32Factory(tinysecp);

async function main() {
    /** Generate Satoshi, Hal, and Adam */
    const satoshi = generateWallet('satoshi');
    const hal = generateWallet('hal');
    const adam = generateWallet('adam');

    console.log({
        satoshi: { address:satoshi.address ,mnemonic: satoshi.mnemonic, xpub: satoshi.xpub },
        hal: { address:hal.address, mnemonic: hal.mnemonic, xpub: hal.xpub },
        adam: { address: adam.address, mnemonic: adam.mnemonic, xpub: adam.xpub },
    });

    /** They decide to create a 2-of-3 multisig wallet */

    // Participants share their xpubs
    const xpubs = [satoshi.xpub, hal.xpub, adam.xpub];

    // Convert xpubs to BIP32 nodes
    const accountNodes = xpubs.map((xpub) => bip32.fromBase58(xpub, NETWORK));

    // Derive public keys at the desired index (e.g., change = 0, index = 0)
    const change = 0;
    const index = 0;
    const pubkeys = accountNodes.map((node) => node.derive(change).derive(index).publicKey);

    // In a real scenario, the public keys would be shared among participants instead of sharing the xpubs
    console.log(
        '\nPublic Keys:',
        pubkeys.map((key) => Buffer.from(key).toString('hex'))
    );

    // Create the multisig address
    const p2ms = payments.p2ms({
        m: 2,
        pubkeys,
        network: NETWORK,
    });

    // Wrap the multisig in a P2WSH
    const p2wsh = payments.p2wsh({
        redeem: p2ms,
        network: NETWORK,
    });

    if (!p2ms.output || !p2wsh.redeem || !p2wsh.redeem.output) {
        throw new Error('Error creating multisig address');
    }

    console.log('\nMultisig Native SegWit Address Generated:');
    console.log(`- Address: ${p2wsh.address}`);
    console.log(`- Witness Script: ${Buffer.from(p2wsh.redeem.output).toString('hex')}`);

// return;



    // /** Create spending transaction */
    const DEPOSIT_TO_MUSIG_TX_ID = '42285d8b1a95cc3888103d3ed0b955910c349bf1a40b1ae53e4419afc3bd5deb'
    const OUTPUT_INDEX = 0; 
    const DEPOSIT_TO_MUSIG_AMOUNT = BigInt(100_000_000 * 100); // 10 BTC
    const utxo = {
        txid: DEPOSIT_TO_MUSIG_TX_ID,
        vout: OUTPUT_INDEX,
        value: DEPOSIT_TO_MUSIG_AMOUNT,
    };
    
    // Generate destination address
    const destinationAddress = {address:'mi3EaoRwuCQLeyaGKejXQFMxsY1FUNAS26'} // generateWallet();
    console.log('\nDestination Address:', destinationAddress.address);

    if (!destinationAddress.address) {
        throw new Error('Error creating destination address');
    }

    const psbt = new Psbt({ network: NETWORK });
    psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
            script: p2wsh.output!, // Use p2wsh.output here for SegWit compatibility
            value: utxo.value,
        },
        witnessScript: p2wsh.redeem.output, // Only add witnessScript for P2WSH
    });
    

    const fee = BigInt(100_000); // tx fee in satoshis
    psbt.addOutput({
        address: destinationAddress.address,
        value: utxo.value - fee,
    });

    // Sign the transaction with satoshi and hal
    const satoshiChildNode = satoshi.accountNode.derive(change).derive(index);
    const halChildNode = hal.accountNode.derive(change).derive(index);
    // const adamChildNode = adam.accountNode.derive(change).derive(index);

    psbt.signInput(0, satoshiChildNode);
    psbt.signInput(0, halChildNode);
    // psbt.signInput(0, adamChildNode);

    
    // Finalize the transaction
    psbt.finalizeInput(0);

    // Extract the raw transaction in hex format
    const txHex = psbt.extractTransaction().toHex();
    console.log('\nSigned Transaction Hex:\n', txHex);
    
}

 main();

