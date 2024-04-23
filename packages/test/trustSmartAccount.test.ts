import dotenv from "dotenv"
import { ENTRYPOINT_ADDRESS_V06 } from "permissionless"
import {
    http,
    type Account,
    type BaseError,
    type Chain,
    Client,
    type DecodeEventLogReturnType,
    type Transport,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    decodeEventLog,
    getContract,
    zeroAddress
} from "viem"
import { polygon } from "viem/chains"
import { beforeAll, beforeEach, describe, expect, test } from "vitest"
import { createTrustSmartAccount } from "../custom-account/accounts/createTrustSmartAccount"
import { EntryPointAbi } from "./abis/EntryPoint"
import { GreeterAbi, GreeterBytecode } from "./abis/Greeter"
import {
    getBundlerClient,
    getFactoryAddress,
    getPimlicoBundlerClient,
    getPimlicoPaymasterClient,
    getPrivateKeyAccount,
    getPublicClient,
    getSmartAccountClient,
    waitForNonceUpdate
} from "./utils"

import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"

dotenv.config()

beforeAll(() => {
    if (!process.env.FACTORY_ADDRESS) {
        throw new Error("FACTORY_ADDRESS environment variable not set")
    }
    if (!process.env.TEST_PRIVATE_KEY) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }
    if (!process.env.RPC_URL) {
        throw new Error("RPC_URL environment variable not set")
    }
})

describe("Trust Account", () => {
    let walletClient: WalletClient<Transport, Chain, Account>
    const client = getPublicClient()
    beforeEach(async () => {
        const owner = getPrivateKeyAccount()
        walletClient = createWalletClient({
            chain: polygon,
            account: owner,
            transport: http()
        })
    })

    test(
        "Trust Account Address",
        async () => {
            const owner = getPrivateKeyAccount()

            const account = await createTrustSmartAccount(client, {
                owner: owner,
                entryPoint: ENTRYPOINT_ADDRESS_V06,
                index: BigInt(0),
                factoryAddress: getFactoryAddress()
            })
            expect(account.address).toHaveLength(42)
            expect(account.address).toMatch(/^0x[0-9a-fA-F]{40}$/)

            expect(
                account.signTransaction({
                    to: zeroAddress,
                    value: 0n,
                    data: "0x"
                })
            ).rejects.toThrow(new SignTransactionNotSupportedBySmartAccount())
        },
        { timeout: 200000 }
    )

    test.skip("Trust smart account client deploy contract", async () => {
        const owner = getPrivateKeyAccount()
        getSmartAccountClient()

        const smartAccountClient = await getSmartAccountClient()
        expect(
            smartAccountClient.deployContract({
                abi: GreeterAbi,
                bytecode: GreeterBytecode
            })
        ).rejects.toThrowError(
            "Trust account doesn't support account deployment"
        )
    })

    test.skip("Trust smart account verifySignature with signTypedData", async () => {
        const smartAccountClient = await getSmartAccountClient()

        const signature = await smartAccountClient.signTypedData({
            domain: {
                name: "Ether Mail",
                version: "1",
                chainId: 1,
                verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
            },
            types: {
                Person: [
                    { name: "name", type: "string" },
                    { name: "wallet", type: "address" }
                ],
                Mail: [
                    { name: "from", type: "Person" },
                    { name: "to", type: "Person" },
                    { name: "contents", type: "string" }
                ]
            },
            primaryType: "Mail",
            message: {
                from: {
                    name: "Cow",
                    wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
                },
                to: {
                    name: "Bob",
                    wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
                },
                contents: "Hello, Bob!"
            }
        })

        const isVerified = await client.verifyTypedData({
            address: smartAccountClient.account.address,
            domain: {
                name: "Ether Mail",
                version: "1",
                chainId: 1,
                verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
            },
            types: {
                Person: [
                    { name: "name", type: "string" },
                    { name: "wallet", type: "address" }
                ],
                Mail: [
                    { name: "from", type: "Person" },
                    { name: "to", type: "Person" },
                    { name: "contents", type: "string" }
                ]
            },
            primaryType: "Mail",
            message: {
                from: {
                    name: "Cow",
                    wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
                },
                to: {
                    name: "Bob",
                    wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
                },
                contents: "Hello, Bob!"
            },
            signature
        })

        expect(isVerified).toBeTruthy()
    })

    test.skip("Trust smart account verifySignature with signTypedData for not deployed", async () => {
        const owner = getPrivateKeyAccount()

        const account = await createTrustSmartAccount(client, {
            owner: owner,
            entryPoint: ENTRYPOINT_ADDRESS_V06,
            index: BigInt(1),
            factoryAddress: getFactoryAddress()
        })

        const smartAccountClient = await getSmartAccountClient({
            account
        })

        const signature = await smartAccountClient.signTypedData({
            domain: {
                name: "Ether Mail",
                version: "1",
                chainId: 1,
                verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
            },
            types: {
                Person: [
                    { name: "name", type: "string" },
                    { name: "wallet", type: "address" }
                ],
                Mail: [
                    { name: "from", type: "Person" },
                    { name: "to", type: "Person" },
                    { name: "contents", type: "string" }
                ]
            },
            primaryType: "Mail",
            message: {
                from: {
                    name: "Cow",
                    wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
                },
                to: {
                    name: "Bob",
                    wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
                },
                contents: "Hello, Bob!"
            }
        })

        const isVerified = await client.verifyTypedData({
            address: smartAccountClient.account.address,
            domain: {
                name: "Ether Mail",
                version: "1",
                chainId: 1,
                verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
            },
            types: {
                Person: [
                    { name: "name", type: "string" },
                    { name: "wallet", type: "address" }
                ],
                Mail: [
                    { name: "from", type: "Person" },
                    { name: "to", type: "Person" },
                    { name: "contents", type: "string" }
                ]
            },
            primaryType: "Mail",
            message: {
                from: {
                    name: "Cow",
                    wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
                },
                to: {
                    name: "Bob",
                    wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
                },
                contents: "Hello, Bob!"
            },
            signature
        })

        expect(isVerified).toBeTruthy()
    })

    test.skip("Trust smart account verifySignature of deployed", async () => {
        const smartAccountClient = await getSmartAccountClient()

        const message = "hello world"

        const signature = await smartAccountClient.signMessage({
            message
        })

        const isVerified = await client.verifyMessage({
            address: smartAccountClient.account.address,
            message,
            signature
        })

        expect(isVerified).toBeTruthy()
    })

    test.skip("Trust smart account verifySignature of not deployed", async () => {
        const owner = getPrivateKeyAccount()

        const account = await createTrustSmartAccount(client, {
            owner: owner,
            entryPoint: ENTRYPOINT_ADDRESS_V06,
            index: BigInt(1),
            factoryAddress: getFactoryAddress()
        })

        const smartAccountClient = await getSmartAccountClient({
            account: account
        })

        const message = "hello world"

        const signature = await smartAccountClient.signMessage({
            message
        })

        const isVerified = await client.verifyMessage({
            address: smartAccountClient.account.address,
            message,
            signature
        })

        expect(isVerified).toBeTruthy()
    })

    test.skip("Trust Smart account client send transaction", async () => {
        const smartAccountClient = await getSmartAccountClient()

        const response = await smartAccountClient.sendTransaction({
            to: zeroAddress,
            value: 0n,
            data: "0x"
        })

        expect(response).toHaveLength(66)
        expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

        await new Promise((res) => {
            setTimeout(res, 1000)
        })
        await waitForNonceUpdate()
    }, 1000000)

    test.skip("Trust Smart account client send multiple transactions", async () => {
        const smartAccountClient = await getSmartAccountClient()

        const pimlicoBundlerClient = getPimlicoBundlerClient()

        const gasPrice = await pimlicoBundlerClient.getUserOperationGasPrice()

        const response = await smartAccountClient.sendTransactions({
            transactions: [
                {
                    to: smartAccountClient.account.address,
                    value: 10n,
                    data: "0x"
                },
                {
                    to: smartAccountClient.account.address,
                    value: 10n,
                    data: "0x"
                }
            ],
            maxFeePerGas: gasPrice.fast.maxFeePerGas,
            maxPriorityFeePerGas: gasPrice.fast.maxPriorityFeePerGas
        })

        expect(response).toHaveLength(66)
        expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)
        await waitForNonceUpdate()
    }, 1000000)

    test("Trust Client send Transaction with paymaster", async () => {
        const bundlerClient = getBundlerClient()
        const pimlicoPaymaster = getPimlicoPaymasterClient()

        const smartAccountClient = await getSmartAccountClient({
            middleware: {
                sponsorUserOperation: pimlicoPaymaster.sponsorUserOperation
            }
        })

        const response = await smartAccountClient.sendTransaction({
            to: zeroAddress,
            value: BigInt(0),
            data: "0x"
        })

        expect(response).toHaveLength(66)
        expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

        const transactionReceipt = await client.waitForTransactionReceipt({
            hash: response
        })

        let eventFound = false

        for (const log of transactionReceipt.logs) {
            try {
                const event = decodeEventLog({
                    abi: EntryPointAbi,
                    ...log
                })
                if (event.eventName === "UserOperationEvent") {
                    eventFound = true
                    const userOperation =
                        await bundlerClient.getUserOperationByHash({
                            //@ts-ignore
                            hash: event.args.userOpHash
                        })
                    expect(
                        userOperation?.userOperation.paymasterAndData
                    ).not.toBe("0x")
                }
            } catch {}
        }

        expect(eventFound).toBeTruthy()
        await waitForNonceUpdate()
    }, 1000000)

    test("Trust Client send multiple Transactions with paymaster", async () => {
        const bundlerClient = getBundlerClient()
        const pimlicoPaymaster = getPimlicoPaymasterClient()

        const smartAccountClient = await getSmartAccountClient({
            middleware: {
                sponsorUserOperation: pimlicoPaymaster.sponsorUserOperation
            }
        })

        const response = await smartAccountClient.sendTransactions({
            transactions: [
                {
                    to: zeroAddress,
                    value: BigInt(0),
                    data: "0x"
                },
                {
                    to: zeroAddress,
                    value: BigInt(0),
                    data: "0x"
                }
            ]
        })

        expect(response).toHaveLength(66)
        expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

        const transactionReceipt = await client.waitForTransactionReceipt({
            hash: response
        })

        let eventFound = false

        for (const log of transactionReceipt.logs) {
            try {
                const event = decodeEventLog({
                    abi: EntryPointAbi,
                    ...log
                })
                if (event.eventName === "UserOperationEvent") {
                    console.log(event.args)
                    eventFound = true
                    const userOperation =
                        await bundlerClient.getUserOperationByHash({
                            //@ts-ignore
                            hash: event.args.userOpHash
                        })
                    expect(
                        userOperation?.userOperation.paymasterAndData
                    ).not.toBe("0x")
                }
            } catch (e) {
                const error = e as BaseError
                if (error.name !== "AbiEventSignatureNotFoundError") throw e
            }
        }

        expect(eventFound).toBeTruthy()
        await waitForNonceUpdate()
    }, 1000000)
})
