import BIP32Factory from 'bip32';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { networks, payments } from 'bitcoinjs-lib';
import * as tinysecp from 'tiny-secp256k1';

export const NETWORK = networks.regtest;

/**
 * BIP48 derivation path for multisig wallets:
 * m / 48' / coin_type' / account' / script_type'
 */
const DERIVATION_PATH = "m/48'/1'/0'/2'"; // Up to the account level


// Mnemonics for the participants. to avoid new addresses every time we run the code
const MNEMONIC_MAP = {
    satoshi: 'jump lonely uncover castle hamster divert orphan until sad jazz enlist y',
    hal: 'inner slab setup crucial tag swap tooth october surge pact salad y',
    adam: 'motor drip grain life lecture tomorrow jeans stairs young version picture y',
} as const;

export const generateWallet = (name?: 'satoshi' | 'hal' | 'adam' ) => {
    const mnemonic = name ? MNEMONIC_MAP[name] : generateMnemonic();
    const seed = mnemonicToSeedSync(mnemonic);
    const bip32 = BIP32Factory(tinysecp);
    const root = bip32.fromSeed(seed, NETWORK);
    const accountNode = root.derivePath(DERIVATION_PATH);

    // Generate the extended public key (xpub) for sharing
    const xpub = accountNode.neutered().toBase58();

    const childNode = accountNode.derive(0).derive(0);
    const { address } = payments.p2wpkh({ pubkey: childNode.publicKey, network: NETWORK });
  

    return {
        mnemonic,
        xpub,
        accountNode,
        address
    };
};
