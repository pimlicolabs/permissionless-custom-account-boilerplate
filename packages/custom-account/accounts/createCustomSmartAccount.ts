import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccount,
    type SmartAccountSigner,
    toSmartAccount
} from "permissionless/accounts"
import { getAccountNonce } from "permissionless/actions"
import type { EntryPoint, Prettify } from "permissionless/types"
import { isSmartAccountDeployed } from "permissionless/utils"
import {
    type Address,
    type Chain,
    type Client,
    type LocalAccount,
    type Transport,
    type TypedData,
    type TypedDataDefinition,
    concatHex
} from "viem"
import { getChainId } from "viem/actions"
import { encodeCallData } from "./utils/encodeCallData"
import { getAccountAddress } from "./utils/getAccountAddress"
import { getDummySignature } from "./utils/getDummySignature"
import { getFactoryData } from "./utils/getFactoryData"
import { signMessage } from "./utils/signMessage"
import { signTransaction } from "./utils/signTransaction"
import { signTypedData } from "./utils/signTypedData"
import { signUserOperation } from "./utils/signUserOperation"

export type CustomSmartAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, "CustomSmartAccount", transport, chain>

export type CreateCustomSmartAccountParameters<
    entryPoint extends EntryPoint,
    TSource extends string = string,
    TAddress extends Address = Address
> = Prettify<{
    owner: SmartAccountSigner<TSource, TAddress>
    factoryAddress: Address
    entryPoint: entryPoint
    index?: bigint
    address?: Address
}>

/**
 * @description Creates an Custom Account from a private key.
 *
 * @returns A Private Key Custom Account.
 */
export async function createCustomSmartAccount<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = string,
    TAddress extends Address = Address
>(
    client: Client<TTransport, TChain, undefined>,
    {
        owner,
        factoryAddress,
        entryPoint: entryPointAddress,
        index = 0n,
        address
    }: CreateCustomSmartAccountParameters<entryPoint, TSource, TAddress>
): Promise<CustomSmartAccount<entryPoint, TTransport, TChain>> {
    const viemSigner: LocalAccount<string> = {
        ...owner,
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount()
        }
    }

    const [accountAddress, chainId] = await Promise.all([
        address ??
            getAccountAddress(client, {
                factoryAddress,
                entryPoint: entryPointAddress,
                owner: viemSigner.address,
                index
            }),
        getChainId(client)
    ])

    if (!accountAddress) throw new Error("Account address not found")

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        accountAddress
    )

    return toSmartAccount({
        address: accountAddress,
        client: client,
        publicKey: accountAddress,
        entryPoint: entryPointAddress,
        source: "CustomSmartAccount",

        signMessage: ({ message }) =>
            signMessage(client, { account: viemSigner, message }),
        signTransaction: signTransaction,
        signTypedData: <
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData
        >(
            typedData: TypedDataDefinition<TTypedData, TPrimaryType>
        ) =>
            signTypedData<TTypedData, TPrimaryType>(client, {
                account: viemSigner,
                ...typedData
            }),
        getNonce: async () => {
            return getAccountNonce(client, {
                sender: accountAddress,
                entryPoint: entryPointAddress
            })
        },
        signUserOperation: async (userOperation) => {
            return signUserOperation(client, {
                account: viemSigner,
                userOperation,
                entryPoint: entryPointAddress,
                chainId: chainId
            })
        },
        getInitCode: async () => {
            smartAccountDeployed =
                smartAccountDeployed ||
                (await isSmartAccountDeployed(client, accountAddress))

            if (smartAccountDeployed) {
                return "0x"
            }

            return concatHex([
                factoryAddress,
                await getFactoryData({
                    account: viemSigner,
                    index
                })
            ])
        },
        async getFactory() {
            smartAccountDeployed =
                smartAccountDeployed ||
                (await isSmartAccountDeployed(client, accountAddress))

            if (smartAccountDeployed) return undefined

            return factoryAddress
        },
        async getFactoryData() {
            smartAccountDeployed =
                smartAccountDeployed ||
                (await isSmartAccountDeployed(client, accountAddress))

            if (smartAccountDeployed) return undefined

            return getFactoryData({
                account: viemSigner,
                index
            })
        },
        async encodeDeployCallData(_) {
            throw new Error("Custom account doesn't support account deployment")
        },
        async encodeCallData(args) {
            return encodeCallData({ args, entryPoint: entryPointAddress })
        },
        async getDummySignature(userOperation) {
            return getDummySignature(userOperation)
        }
    })
}
