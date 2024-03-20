import type { EntryPoint } from "permissionless/types"
import { getEntryPointVersion } from "permissionless/utils"
import { type Address, type Hex, encodeFunctionData } from "viem"

export const encodeCallData = async ({
    args,
    entryPoint
}: {
    args:
        | {
              to: `0x${string}`
              value: bigint
              data: `0x${string}`
          }
        | {
              to: `0x${string}`
              value: bigint
              data: `0x${string}`
          }[]
    entryPoint: EntryPoint
}) => {
    if (Array.isArray(args)) {
        const argsArray = args as {
            to: Address
            value: bigint
            data: Hex
        }[]

        if (getEntryPointVersion(entryPoint) === "v0.6") {
            return encodeFunctionData({
                abi: [
                    {
                        inputs: [
                            {
                                internalType: "address[]",
                                name: "dest",
                                type: "address[]"
                            },
                            {
                                internalType: "bytes[]",
                                name: "func",
                                type: "bytes[]"
                            }
                        ],
                        name: "executeBatch",
                        outputs: [],
                        stateMutability: "nonpayable",
                        type: "function"
                    }
                ],
                functionName: "executeBatch",
                args: [argsArray.map((a) => a.to), argsArray.map((a) => a.data)]
            })
        }
        return encodeFunctionData({
            abi: [
                {
                    inputs: [
                        {
                            internalType: "address[]",
                            name: "dest",
                            type: "address[]"
                        },
                        {
                            internalType: "uint256[]",
                            name: "value",
                            type: "uint256[]"
                        },
                        {
                            internalType: "bytes[]",
                            name: "func",
                            type: "bytes[]"
                        }
                    ],
                    name: "executeBatch",
                    outputs: [],
                    stateMutability: "nonpayable",
                    type: "function"
                }
            ],
            functionName: "executeBatch",
            args: [
                argsArray.map((a) => a.to),
                argsArray.map((a) => a.value),
                argsArray.map((a) => a.data)
            ]
        })
    }

    const { to, value, data } = args as {
        to: Address
        value: bigint
        data: Hex
    }

    return encodeFunctionData({
        abi: [
            {
                inputs: [
                    {
                        internalType: "address",
                        name: "dest",
                        type: "address"
                    },
                    {
                        internalType: "uint256",
                        name: "value",
                        type: "uint256"
                    },
                    {
                        internalType: "bytes",
                        name: "func",
                        type: "bytes"
                    }
                ],
                name: "execute",
                outputs: [],
                stateMutability: "nonpayable",
                type: "function"
            }
        ],
        functionName: "execute",
        args: [to, value, data]
    })
}
