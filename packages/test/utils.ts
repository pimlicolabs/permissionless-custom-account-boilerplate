import {
    ENTRYPOINT_ADDRESS_V06,
    createBundlerClient,
    createSmartAccountClient
} from "permissionless"
import type { SmartAccount, SmartAccountSigner } from "permissionless/accounts"
import type { Middleware } from "permissionless/actions/smartAccount"
import {
    createPimlicoBundlerClient,
    createPimlicoPaymasterClient
} from "permissionless/clients/pimlico"
import type { ENTRYPOINT_ADDRESS_V06_TYPE } from "permissionless/types"
import {
    http,
    type Address,
    type Hex,
    createPublicClient,
    createWalletClient,
    defineChain,
    parseEther
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import * as allChains from "viem/chains"
import { createTrustSmartAccount } from "../custom-account/accounts"

export const getFactoryAddress = () => {
    if (!process.env.FACTORY_ADDRESS)
        throw new Error("FACTORY_ADDRESS environment variable not set")
    const factoryAddress = process.env.FACTORY_ADDRESS as Address
    return factoryAddress
}

export const getPrivateKeyAccount = () => {
    if (!process.env.TEST_PRIVATE_KEY)
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    return privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex)
}

export const getPublicClient = () => {
    if (!process.env.RPC_URL)
        throw new Error("RPC_URL environment variable not set")

    const client = createPublicClient({
        chain: allChains.polygon,
        transport: http()
    })

    return client
}

const publicClient = getPublicClient()
const chainId = await publicClient.getChainId()

export const getTestingChain = () => {
    // If custom chain specified in environment variable, use that

    const chain = Object.values(allChains).find((chain) => chain.id === chainId)
    if (chain) return chain

    // Otherwise, use fallback to goerli
    return defineChain({
        id: chainId,
        network: "goerli",
        name: "Goerli",
        nativeCurrency: { name: "Goerli Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
            default: {
                http: ["http://0.0.0.0:3000"]
            },
            public: {
                http: ["http://0.0.0.0:3000"]
            }
        },
        testnet: true
    })
}

export const getSignerToTrustSmartAccount = async (
    {
        signer = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex),
        index
    }: {
        signer?: SmartAccountSigner
        address?: Address
        index?: bigint
    } = { index: 0n }
) => {
    if (!process.env.TEST_PRIVATE_KEY)
        throw new Error("TEST_PRIVATE_KEY environment variable not set")

    const publicClient = getPublicClient()

    return await createTrustSmartAccount(publicClient, {
        owner: signer,
        entryPoint: ENTRYPOINT_ADDRESS_V06,
        index: index,
        factoryAddress: getFactoryAddress()
    })
}

export const getSmartAccountClient = async ({
    account,
    middleware,
    preFund = false
}: Middleware<ENTRYPOINT_ADDRESS_V06_TYPE> & {
    account?: SmartAccount<ENTRYPOINT_ADDRESS_V06_TYPE>
    preFund?: boolean
} = {}) => {
    if (!process.env.BUNDLER_RPC_HOST)
        throw new Error("BUNDLER_RPC_HOST environment variable not set")
    const chain = getTestingChain()
    const pimlicoBundlerClient = getPimlicoBundlerClient()
    const smartAccountClient = createSmartAccountClient({
        account: account ?? (await getSignerToTrustSmartAccount()),
        entryPoint: getEntryPoint(),
        chain,
        bundlerTransport: http(`${process.env.BUNDLER_RPC_HOST}`),
        middleware:
            typeof middleware === "function"
                ? middleware
                : {
                      gasPrice: async () => {
                          return (
                              await pimlicoBundlerClient.getUserOperationGasPrice()
                          ).fast
                      },
                      ...middleware
                  }
    })
    if (preFund) {
        const walletClient = getEoaWalletClient()

        const balance = await publicClient.getBalance({
            address: smartAccountClient.account.address
        })

        if (balance < parseEther("0.1")) {
            await walletClient.sendTransaction({
                to: smartAccountClient.account.address,
                value: parseEther("0.1"),
                data: "0x"
            })
        }
    }

    return smartAccountClient
}

export const getEoaWalletClient = () => {
    return createWalletClient({
        account: getPrivateKeyAccount(),
        chain: allChains.polygon,
        transport: http()
    })
}

export const getEntryPoint = () => {
    return ENTRYPOINT_ADDRESS_V06
}

export const getBundlerClient = () => {
    if (!process.env.BUNDLER_RPC_HOST)
        throw new Error("BUNDLER_RPC_HOST environment variable not set")

    const chain = getTestingChain()

    return createBundlerClient({
        chain: chain,
        transport: http(`${process.env.BUNDLER_RPC_HOST}`),
        entryPoint: getEntryPoint()
    })
}

export const getPimlicoBundlerClient = () => {
    if (!process.env.PIMLICO_BUNDLER_RPC_HOST)
        throw new Error("PIMLICO_BUNDLER_RPC_HOST environment variable not set")

    const chain = getTestingChain()

    return createPimlicoBundlerClient({
        chain: chain,
        transport: http(`${process.env.PIMLICO_BUNDLER_RPC_HOST}`),
        entryPoint: getEntryPoint()
    })
}

export const getPimlicoPaymasterClient = () => {
    if (!process.env.PIMLICO_PAYMASTER_RPC_HOST)
        throw new Error(
            "PIMLICO_PAYMASTER_RPC_HOST environment variable not set"
        )

    const chain = getTestingChain()

    return createPimlicoPaymasterClient({
        chain: chain,
        transport: http(`${process.env.PIMLICO_PAYMASTER_RPC_HOST}`),
        entryPoint: getEntryPoint()
    })
}

export const isAccountDeployed = async (accountAddress: Address) => {
    const publicClient = getPublicClient()

    const contractCode = await publicClient.getBytecode({
        address: accountAddress
    })

    if ((contractCode?.length ?? 0) > 2) return true

    return false
}

export const waitForNonceUpdate = async (time = 10000) => {
    return new Promise((res) => {
        setTimeout(res, time)
    })
}
